import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Bell, Star, TrendingUp, TrendingDown, Clock, Newspaper, Share2, Info, Loader2, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid, Legend, LabelList } from 'recharts';
import { StockData, AnalysisData } from '../types';
import { fetchAnalysisData, fetchStockHistory, fetchStockData, fetchCompanyNews } from '../services/geminiService';
import { StockNotes } from './StockNotes';

interface StockDetailViewProps {
    stock: StockData;
    onClose: () => void;
    language?: string;
}

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'];
const TABS = ['Chart', 'Rates', 'News', 'Info', 'Notes', 'Analysis'];

const formatNumber = (num: any) => {
    if (num === undefined || num === null) return 'N/A';
    let val = typeof num === 'string' ? parseFloat(num.replace(/[^0-9.-]/g, '')) : num;
    if (isNaN(val)) return num;
    const absVal = Math.abs(val);
    const locale = 'es-ES'; // Use commas for decimals
    if (absVal >= 1.0e12) return (val / 1.0e12).toLocaleString(locale, { maximumFractionDigits: 2 }) + ' T';
    if (absVal >= 1.0e9) return (val / 1.0e9).toLocaleString(locale, { maximumFractionDigits: 2 }) + ' B';
    if (absVal >= 1.0e6) return (val / 1.0e6).toLocaleString(locale, { maximumFractionDigits: 2 }) + ' M';
    if (absVal >= 1.0e3) return (val / 1.0e3).toLocaleString(locale, { maximumFractionDigits: 2 }) + ' k';
    return val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const StockDetailView: React.FC<StockDetailViewProps> = ({ stock: initialStock, onClose, language = 'en' }) => {
    const [stock, setStock] = useState<StockData>(initialStock);
    const [activeTab, setActiveTab] = useState('Chart');
    const [activeTimeframe, setActiveTimeframe] = useState('1Y');
    const [chartData, setChartData] = useState<{ timestamp: number; price: number }[]>([]);
    const [chartLoading, setChartLoading] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisData>({});
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [news, setNews] = useState<any[]>([]);
    const [loadingNews, setLoadingNews] = useState(false);

    // Hover state for interactive chart
    const [hoveredData, setHoveredData] = useState<{ price: number; date: number } | null>(null);

    useEffect(() => {
        const loadFull = async () => {
            const full = await fetchStockData(stock.symbol);
            if (full) setStock(full);
        };
        loadFull();
    }, [stock.symbol]);

    useEffect(() => {
        let mounted = true;
        const loadChart = async () => {
            setChartLoading(true);
            const data = await fetchStockHistory(stock.symbol, activeTimeframe);
            if (mounted) {
                if (data.length) {
                    setChartData(data);
                    // Update header price to match latest chart point
                    setStock(prev => ({ ...prev, currentPrice: data[data.length - 1].price }));
                } else {
                    setChartData([{ timestamp: Date.now(), price: stock.currentPrice }]);
                }
                setChartLoading(false);
            }
        };
        loadChart();
        return () => { mounted = false; };
    }, [stock.symbol, activeTimeframe]);

    useEffect(() => {
        if (activeTab === 'Analysis') {
            const load = async () => {
                setLoadingAnalysis(true);
                const data = await fetchAnalysisData(stock.symbol);
                if (data) setAnalysis(data);
                setLoadingAnalysis(false);
            };
            load();
        } else if (activeTab === 'News') {
            const loadNews = async () => {
                setLoadingNews(true);
                const data = await fetchCompanyNews(stock.symbol);
                setNews(data);
                setLoadingNews(false);
            };
            loadNews();
        }
    }, [activeTab, stock.symbol]);

    const periodStats = useMemo(() => {
        let basePrice = stock.previousClose || (stock.currentPrice / (1 + (stock.dayChangePercent || 0) / 100));
        let current = stock.currentPrice;

        if (chartData.length > 0 && !chartLoading) {
            current = chartData[chartData.length - 1].price;
            if (activeTimeframe !== '1D') {
                basePrice = chartData[0].price;
            }
        }

        const abs = current - basePrice;
        const pct = basePrice !== 0 ? (abs / basePrice) * 100 : 0;

        return { abs, pct, isPositive: abs >= 0 };
    }, [chartData, activeTimeframe, chartLoading, stock.previousClose, stock.currentPrice, stock.dayChangePercent]);

    const { abs: absChange, pct: pctChange, isPositive } = periodStats;
    const chartColor = isPositive ? '#22c55e' : '#ef4444';

    const TableRow = ({ labelEs, labelEn, value }: { labelEs: string, labelEn: string, value: any }) => (
        <div className="flex justify-between items-center py-4 px-4 border-b border-zinc-800">
            <div className="flex flex-col">
                <span className="text-white text-xs font-bold">{labelEs}</span>
                <span className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider">{labelEn}</span>
            </div>
            <span className="text-white text-sm font-bold font-mono">{value || 'N/A'}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col animate-in slide-in-from-right duration-300">

            <div className="px-4 py-3 flex justify-between items-center bg-black border-b border-zinc-900 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 -ml-2 text-zinc-300"><ArrowLeft size={24} /></button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white overflow-hidden">
                            <img src={stock.logoUrl} alt={stock.symbol} className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm leading-none">{stock.companyName}</h2>
                            <span className="text-zinc-500 text-[10px] font-bold uppercase">{stock.symbol}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-zinc-500">
                    <Share2 size={18} /><Star size={18} /><Bell size={18} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-black">
                <div className="px-6 pt-8 pb-4">
                    <div className="text-5xl font-bold tracking-tight mb-2 font-mono tabular-nums">
                        {stock.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xl text-zinc-500 ml-2 font-sans font-medium align-top mt-1 inline-block">{stock.currency}</span>
                    </div>
                    <div className="flex items-center justify-between h-8">
                        <div className={`flex items-center gap-2 font-bold text-lg ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                            {isPositive ? '+' : ''}{absChange.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pctChange.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                            {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>
                    </div>
                </div>

                <div className="px-4 mt-4">
                    <div className="flex justify-between bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                        {TIMEFRAMES.map(tf => (
                            <button key={tf} onClick={() => setActiveTimeframe(tf)} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${activeTimeframe === tf ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' : 'text-zinc-500'}`}>{tf}</button>
                        ))}
                    </div>
                </div>

                <div className="h-[350px] w-full mt-6 select-none">
                    {chartLoading ? (
                        <div className="w-full h-full flex items-center justify-center"><Loader2 className="text-blue-500 animate-spin" size={32} /></div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} /><stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                <XAxis
                                    dataKey="timestamp"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717a', fontSize: 11 }}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                    minTickGap={50}
                                    dy={10}
                                />
                                <YAxis
                                    domain={['auto', 'auto']}
                                    orientation="left"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717a', fontSize: 11 }}
                                    width={40}
                                    tickFormatter={(val) => val.toFixed(0)}
                                    dx={-5}
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white text-zinc-900 border border-zinc-200 p-3 rounded-md shadow-lg min-w-[140px]">
                                                    <div className="font-bold text-sm">
                                                        {data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {stock.currency}
                                                    </div>
                                                    <div className="text-xs text-zinc-500 mt-1">
                                                        {new Date(data.timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                    cursor={{ stroke: '#5f6368', strokeWidth: 1, strokeDasharray: '3 3' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="price"
                                    stroke={chartColor}
                                    strokeWidth={2}
                                    fill="url(#colorPrice)"
                                    isAnimationActive={false}
                                    activeDot={{ r: 5, fill: chartColor, stroke: '#fff', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="mt-8 px-4 border-b border-zinc-900">
                    <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                        {TABS.map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-blue-500 text-blue-500' : 'border-transparent text-zinc-500'}`}>{tab}</button>
                        ))}
                    </div>
                </div>

                <div className="mt-6 pb-20">
                    {activeTab === 'News' && (
                        <div className="px-6 space-y-6">
                            {loadingNews ? (
                                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" /></div>
                            ) : (
                                news.map((item, i) => (
                                    <a
                                        key={i}
                                        href={item.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:bg-zinc-900 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-zinc-600" />
                                                <span className="text-zinc-600 text-sm">{item.time}</span>
                                            </div>
                                            <div className="bg-zinc-800 text-zinc-400 text-xs font-bold px-3 py-1 rounded uppercase">
                                                {item.tag}
                                            </div>
                                        </div>
                                        <h3 className="text-white font-bold text-lg mb-3 leading-snug group-hover:text-blue-400 transition-colors">
                                            {item.title}
                                        </h3>
                                        <p className="text-zinc-500 text-sm line-clamp-3 leading-relaxed">
                                            {item.snippet}
                                        </p>
                                        <div className="mt-5 flex items-center text-blue-500 font-bold text-sm uppercase tracking-wide group-hover:text-blue-400">
                                            {item.source} <ExternalLink size={16} className="ml-1" />
                                        </div>
                                    </a>
                                ))
                            )}
                        </div>
                    )}
                    {activeTab === 'Rates' && (
                        <div className="px-6 space-y-6">
                            <h3 className="text-white font-bold text-lg hidden">Key Statistics</h3>
                            <div className="border-t border-zinc-900">
                                <TableRow labelEs="CIERRE ANTERIOR" labelEn="Previous Close" value={stock.previousClose !== undefined ? stock.previousClose.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + stock.currency : 'N/A'} />
                                <TableRow labelEs="INTERVALO DIARIO" labelEn="Day Range" value={stock.dayLow !== undefined && stock.dayHigh !== undefined ? `${stock.dayLow.toLocaleString(undefined, { minimumFractionDigits: 2 })} - ${stock.dayHigh.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'N/A'} />
                                <TableRow labelEs="INTERVALO ANUAL" labelEn="Year Range" value={stock.fiftyTwoWeekLow !== undefined && stock.fiftyTwoWeekHigh !== undefined ? `${stock.fiftyTwoWeekLow.toLocaleString(undefined, { minimumFractionDigits: 2 })} - ${stock.fiftyTwoWeekHigh.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'N/A'} />
                                <TableRow labelEs="CAP. BURSÁTIL" labelEn="Market Cap" value={formatNumber(stock.marketCap) + ' ' + stock.currency} />
                                <TableRow labelEs="VOLUMEN MEDIO" labelEn="Avg Volume" value={formatNumber(stock.avgVolume)} />
                                <TableRow labelEs="RELACIÓN PRECIO-BENEFICIO" labelEn="P/E Ratio" value={stock.trailingPE?.toFixed(2)} />
                                <TableRow labelEs="RENTABILIDAD POR DIVIDENDO" labelEn="Dividend Yield" value={stock.dividendYield ? `${(stock.dividendYield * 100).toFixed(2)} %` : '-'} />
                                <TableRow labelEs="BOLSA DE VALORES PRINCIPAL" labelEn="Primary Exchange" value={stock.exchange || (stock.currency === 'USD' ? 'NASDAQ' : 'BME')} />
                            </div>
                        </div>
                    )}
                    {activeTab === 'Analysis' && (
                        <div className="px-4 space-y-6">
                            {loadingAnalysis ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" /></div> : (
                                <>
                                    <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-zinc-800">
                                        <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-widest text-zinc-500">Recommendation trend</h3>
                                        <div className="h-72">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analysis.recommendationTrend} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                                                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 500, dy: 10 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                                                    <Tooltip
                                                        cursor={{ fill: '#27272a', opacity: 0.4 }}
                                                        content={({ active, payload, label }) => {
                                                            if (active && payload && payload.length) {
                                                                return (
                                                                    <div className="bg-[#09090b] border border-zinc-800 p-3 rounded-xl shadow-xl">
                                                                        <p className="text-zinc-400 font-bold mb-2 capitalize text-xs">{label}</p>
                                                                        <div className="space-y-1">
                                                                            {payload.map((entry: any, index: number) => (
                                                                                <div key={index} className="flex items-center justify-between text-xs gap-4">
                                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                                                    <span className="text-zinc-300 capitalize">{entry.name}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        }}
                                                    />
                                                    <Legend
                                                        layout="vertical"
                                                        verticalAlign="middle"
                                                        align="right"
                                                        iconType="square"
                                                        iconSize={10}
                                                        wrapperStyle={{ paddingLeft: '20px', fontSize: '12px', fontWeight: 500, color: '#a1a1aa' }}
                                                    />
                                                    {/* Reverse order of stack to match image: Strong Buy on top (if mapped correctly) or bottom? 
                                                        Standard stacked bar usually builds from 0 up. 
                                                        Image has Green on Top, Red on bottom? No, actually typically Strong Buy (Green) is effectively distinct.
                                                        Let's look at image: Green (Strong Buy) is at the TOP of the bar? Or Bottom?
                                                        Usually "Strong Buy" is the best rating. In the image:
                                                        Top Green (Strong Buy 5)
                                                        Light Green (Buy 24)
                                                        Yellow (Hold 15)
                                                        Orange (Sell)
                                                        Red (Strong Sell)
                                                        So Strong Buy is topmost. 
                                                        Recharts stacks in order of definition. Last one defined is on TOP. 
                                                        So we should define Strong Sell first, then Sell, Hold, Buy, Strong Buy.
                                                    */}
                                                    <Bar dataKey="strongSell" name="Strong Sell" stackId="a" fill="#ef4444" radius={[0, 0, 4, 4]}>
                                                        <LabelList dataKey="strongSell" position="center" fill="white" fontSize={10} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ''} />
                                                    </Bar>
                                                    <Bar dataKey="sell" name="Sell" stackId="a" fill="#f97316">
                                                        <LabelList dataKey="sell" position="center" fill="white" fontSize={10} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ''} />
                                                    </Bar>
                                                    <Bar dataKey="hold" name="Hold" stackId="a" fill="#eab308">
                                                        <LabelList dataKey="hold" position="center" fill="white" fontSize={10} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ''} />
                                                    </Bar>
                                                    <Bar dataKey="buy" name="Buy" stackId="a" fill="#84cc16">
                                                        <LabelList dataKey="buy" position="center" fill="white" fontSize={10} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ''} />
                                                    </Bar>
                                                    <Bar dataKey="strongBuy" name="Strong Buy" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]}>
                                                        <LabelList dataKey="strongBuy" position="center" fill="white" fontSize={10} fontWeight="bold" formatter={(v: number) => v > 0 ? v : ''} />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-zinc-800">
                                        <h3 className="text-white font-bold mb-2 uppercase text-xs tracking-widest text-zinc-500">Analyst Target</h3>
                                        <div className="text-4xl font-black text-blue-400">
                                            {stock.currency || '$'}{analysis.priceTarget?.average?.toFixed(2) || '---'}
                                        </div>
                                        <p className="text-xs text-zinc-500 font-bold mt-1">Institutional Consensus Mean</p>
                                    </div>
                                    <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-zinc-800">
                                        <h3 className="text-white font-bold mb-4 uppercase text-xs tracking-widest text-zinc-500">Recommendation Rating</h3>
                                        <div className="relative pt-6 pb-2">
                                            <div className="h-1.5 w-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"></div>
                                            {/* Pointer */}
                                            <div
                                                className="absolute top-0 flex flex-col items-center transform -translate-x-1/2 transition-all duration-500"
                                                style={{ left: analysis.analystRating ? `${(analysis.analystRating - 1) / 4 * 100}%` : '50%' }}
                                            >
                                                <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded mb-1 shadow-lg border border-blue-400">
                                                    {analysis.analystRating?.toFixed(1) || 'N/A'}
                                                </div>
                                                <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-[#1C1C1E]"></div>
                                            </div>

                                            <div className="flex justify-between mt-4 text-xs font-bold text-zinc-500 uppercase">
                                                <span className="text-green-500">1 Buy</span>
                                                <span className="text-yellow-500">3 Hold</span>
                                                <span className="text-red-500">5 Sell</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-[#1C1C1E] rounded-2xl p-6 border border-zinc-800">
                                        <h3 className="text-white font-bold mb-8 uppercase text-xs tracking-widest text-zinc-500">Price targets</h3>
                                        <div className="relative h-12">
                                            {/* Range Bar */}
                                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-zinc-800 rounded-full -translate-y-1/2"></div>
                                            <div className="absolute top-1/2 h-1 bg-blue-900/50 rounded-full -translate-y-1/2"
                                                style={{
                                                    left: `${((analysis.priceTarget?.low || 0) / (analysis.priceTarget?.high || 1)) * 20}%`,
                                                    right: `${100 - ((analysis.priceTarget?.high || 0) / (analysis.priceTarget?.high || 1)) * 80}%`
                                                }}
                                            ></div>

                                            {/* Low */}
                                            <div className="absolute top-1/2 left-[10%] -translate-y-1/2 flex flex-col items-center group">
                                                <div className="w-3 h-3 bg-[#1C1C1E] border-2 border-red-500 rounded-full z-10 mb-2"></div>
                                                <span className="text-red-500 text-xs font-bold whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity absolute top-6">Low {analysis.priceTarget?.low?.toFixed(2)}</span>
                                            </div>

                                            {/* High */}
                                            <div className="absolute top-1/2 right-[10%] -translate-y-1/2 flex flex-col items-center group">
                                                <div className="w-3 h-3 bg-[#1C1C1E] border-2 border-green-500 rounded-full z-10 mb-2"></div>
                                                <span className="text-green-500 text-xs font-bold whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity absolute top-6">High {analysis.priceTarget?.high?.toFixed(2)}</span>
                                            </div>

                                            {/* Average */}
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
                                                <div className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded shadow-lg mb-1">
                                                    {analysis.priceTarget?.average?.toFixed(2)}
                                                </div>
                                                <div className="w-4 h-4 bg-blue-500 rounded-full border-4 border-[#1C1C1E]"></div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {activeTab === 'Notes' && (
                        <StockNotes symbol={stock.symbol} />
                    )}
                    {activeTab === 'Info' && (
                        <div className="px-6 py-4">
                            <div className="bg-[#0c0c0d] rounded-2xl p-6 border border-zinc-800">
                                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2"><Info size={18} className="text-blue-500" /> Summary</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">{stock.description}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StockDetailView;