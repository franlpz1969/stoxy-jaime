import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Bell, Star, TrendingUp, TrendingDown, Clock, Newspaper, Share2, Info, Loader2, ExternalLink, MapPin, Users, Globe, Building2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid, Legend, LabelList } from 'recharts';
import { StockData, AnalysisData } from '../types';
import { fetchAnalysisData, fetchStockHistory, fetchStockData, fetchCompanyNews, getCompanyLogo } from '../services/geminiService';
import { StockNotes } from './StockNotes';
import { SankeyChart } from './SankeyChart';

interface StockDetailViewProps {
    stock: StockData;
    onClose: () => void;
    language?: string;
}

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'];
const TABS = ['Chart', 'Rates', 'News', 'Info', 'Notes', 'Analysis', 'State'];

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
        if (activeTab === 'Analysis' || activeTab === 'State') {
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
        <div className="flex justify-between items-center py-4 px-4 border-b border-gray-200 dark:border-zinc-800">
            <div className="flex flex-col">
                <span className="text-gray-900 dark:text-white text-xs font-bold">{labelEs}</span>
                <span className="text-gray-500 dark:text-zinc-500 text-[10px] font-medium uppercase tracking-wider">{labelEn}</span>
            </div>
            <span className="text-gray-900 dark:text-white text-sm font-bold font-mono">{value || 'N/A'}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex flex-col animate-in slide-in-from-right duration-300 transition-colors">

            <div className="px-4 py-3 flex justify-between items-center bg-white dark:bg-black border-b border-gray-200 dark:border-zinc-900 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 -ml-2 text-gray-600 dark:text-zinc-300"><ArrowLeft size={24} /></button>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-200 dark:border-transparent overflow-hidden flex items-center justify-center p-0.5">
                            <img
                                src={stock.logoUrl || getCompanyLogo(stock.symbol)}
                                alt={stock.symbol}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    const target = e.currentTarget;
                                    if (target.src.includes('raw.githubusercontent.com')) {
                                        target.src = `https://logo.clearbit.com/${stock.symbol.toLowerCase()}.com`;
                                    } else if (target.src.includes('logo.clearbit.com')) {
                                        target.src = `https://www.google.com/s2/favicons?domain=${stock.symbol.toLowerCase()}.com&sz=128`;
                                    } else {
                                        target.style.display = 'none';
                                    }
                                }}
                            />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm leading-none text-gray-900 dark:text-white">{stock.companyName}</h2>
                            <span className="text-gray-500 dark:text-zinc-500 text-[10px] font-bold uppercase">{stock.symbol}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-gray-400 dark:text-zinc-500">
                    <Share2 size={18} /><Star size={18} /><Bell size={18} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black">
                <div className="px-6 pt-8 pb-4">
                    <div className="text-5xl font-bold tracking-tight mb-2 font-mono tabular-nums text-gray-900 dark:text-white">
                        {stock.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xl text-gray-500 dark:text-zinc-500 ml-2 font-sans font-medium align-top mt-1 inline-block">{stock.currency}</span>
                    </div>
                    <div className="flex items-center justify-between h-8">
                        <div className={`flex items-center gap-2 font-bold text-lg ${isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>
                            {isPositive ? '+' : ''}{absChange.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pctChange.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                            {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>
                    </div>
                </div>

                <div className="px-4 mt-4">
                    <div className="flex justify-between bg-gray-100 dark:bg-zinc-900/50 p-1 rounded-xl border border-gray-200 dark:border-zinc-800/50">
                        {TIMEFRAMES.map(tf => (
                            <button key={tf} onClick={() => setActiveTimeframe(tf)} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${activeTimeframe === tf ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm border border-gray-300 dark:border-zinc-700' : 'text-gray-500 dark:text-zinc-500'}`}>{tf}</button>
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

                <div className="mt-8 border-b border-gray-200 dark:border-zinc-900">
                    <div className="flex items-center justify-between px-2 sm:px-4">
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    pb-3 border-b-2 transition-all flex-1 text-center
                                    ${activeTab === tab ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 dark:text-zinc-500'}

                                    /* Mobile Styles: Condensed, Smaller, Tight Tracking */
                                    text-[10px] uppercase font-condensed font-bold tracking-tighter

                                    /* Desktop Styles: Standard Font, Larger, Wide Tracking */
                                    sm:text-xs sm:font-sans sm:font-black sm:tracking-widest
                                `}
                            >
                                {tab}
                            </button>
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
                                        className="block bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-gray-400 dark:text-zinc-600" />
                                                <span className="text-gray-500 dark:text-zinc-600 text-sm">{item.time}</span>
                                            </div>
                                            <div className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 text-xs font-bold px-3 py-1 rounded uppercase">
                                                {item.tag}
                                            </div>
                                        </div>
                                        <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-3 leading-snug group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                            {item.title}
                                        </h3>
                                        <p className="text-gray-500 dark:text-zinc-500 text-sm line-clamp-3 leading-relaxed">
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
                            <h3 className="text-gray-900 dark:text-white font-bold text-lg hidden">Key Statistics</h3>
                            <div className="border-t border-gray-200 dark:border-zinc-900">
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
                                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200 dark:border-zinc-800">
                                        <h3 className="font-bold mb-4 uppercase text-xs tracking-widest text-gray-500 dark:text-zinc-500">Recommendation trend</h3>
                                        <div className="h-72">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analysis.recommendationTrend} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-zinc-800" />
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
                                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200 dark:border-zinc-800">
                                        <h3 className="font-bold mb-2 uppercase text-xs tracking-widest text-gray-500 dark:text-zinc-500">Analyst Target</h3>
                                        <div className="text-3xl sm:text-4xl font-black text-blue-500 dark:text-blue-400">
                                            {stock.currency || '$'}{analysis.priceTarget?.average?.toFixed(2) || '---'}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-zinc-500 font-bold mt-1">Institutional Consensus Mean</p>
                                    </div>
                                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200 dark:border-zinc-800">
                                        <h3 className="font-bold mb-4 uppercase text-xs tracking-widest text-gray-500 dark:text-zinc-500">Recommendation Rating</h3>
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
                                                <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-[#1C1C1E]"></div>
                                            </div>

                                            <div className="flex justify-between mt-4 text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase">
                                                <span className="text-green-500">1 Buy</span>
                                                <span className="text-yellow-500">3 Hold</span>
                                                <span className="text-red-500">5 Sell</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200 dark:border-zinc-800">
                                        <h3 className="font-bold mb-8 uppercase text-xs tracking-widest text-gray-500 dark:text-zinc-500">Price targets</h3>
                                        <div className="relative h-12">
                                            {/* Range Bar */}
                                            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-zinc-800 rounded-full -translate-y-1/2"></div>
                                            <div className="absolute top-1/2 h-1 bg-blue-900/50 rounded-full -translate-y-1/2"
                                                style={{
                                                    left: `${((analysis.priceTarget?.low || 0) / (analysis.priceTarget?.high || 1)) * 20}%`,
                                                    right: `${100 - ((analysis.priceTarget?.high || 0) / (analysis.priceTarget?.high || 1)) * 80}%`
                                                }}
                                            ></div>

                                            {/* Low */}
                                            <div className="absolute top-1/2 left-[10%] -translate-y-1/2 flex flex-col items-center group">
                                                <div className="w-3 h-3 bg-white dark:bg-[#1C1C1E] border-2 border-red-500 rounded-full z-10 mb-2"></div>
                                                <span className="text-red-500 text-xs font-bold whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity absolute top-6">Low {analysis.priceTarget?.low?.toFixed(2)}</span>
                                            </div>

                                            {/* High */}
                                            <div className="absolute top-1/2 right-[10%] -translate-y-1/2 flex flex-col items-center group">
                                                <div className="w-3 h-3 bg-white dark:bg-[#1C1C1E] border-2 border-green-500 rounded-full z-10 mb-2"></div>
                                                <span className="text-green-500 text-xs font-bold whitespace-nowrap opacity-60 group-hover:opacity-100 transition-opacity absolute top-6">High {analysis.priceTarget?.high?.toFixed(2)}</span>
                                            </div>

                                            {/* Average */}
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
                                                <div className="bg-blue-500 text-white text-sm font-bold px-3 py-1 rounded shadow-lg mb-1">
                                                    {analysis.priceTarget?.average?.toFixed(2)}
                                                </div>
                                                <div className="w-4 h-4 bg-blue-500 rounded-full border-4 border-white dark:border-[#1C1C1E]"></div>
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
                        <div className="px-6 py-4 space-y-4">
                            <div className="bg-white dark:bg-[#0c0c0d] rounded-2xl p-6 border border-gray-200 dark:border-zinc-800">
                                <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-4 flex items-center gap-2"><Info size={18} className="text-blue-500" /> About {stock.companyName}</h3>
                                <p className="text-gray-600 dark:text-zinc-400 text-sm leading-relaxed mb-6">{stock.description}</p>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-100 dark:bg-zinc-900/50 p-4 rounded-xl">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-500 mb-2">
                                            <Building2 size={16} />
                                            <span className="text-xs font-bold uppercase">Sector</span>
                                        </div>
                                        <div className="text-gray-900 dark:text-white font-medium text-sm">{stock.sector || 'N/A'}</div>
                                    </div>
                                    <div className="bg-gray-100 dark:bg-zinc-900/50 p-4 rounded-xl">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-500 mb-2">
                                            <Building2 size={16} />
                                            <span className="text-xs font-bold uppercase">Industry</span>
                                        </div>
                                        <div className="text-gray-900 dark:text-white font-medium text-sm">{stock.industry || 'N/A'}</div>
                                    </div>
                                    <div className="bg-gray-100 dark:bg-zinc-900/50 p-4 rounded-xl">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-500 mb-2">
                                            <Users size={16} />
                                            <span className="text-xs font-bold uppercase">Employees</span>
                                        </div>
                                        <div className="text-gray-900 dark:text-white font-medium text-sm">{stock.employees?.toLocaleString() || 'N/A'}</div>
                                    </div>
                                    <div className="bg-gray-100 dark:bg-zinc-900/50 p-4 rounded-xl">
                                        <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-500 mb-2">
                                            <MapPin size={16} />
                                            <span className="text-xs font-bold uppercase">Location</span>
                                        </div>
                                        <div className="text-gray-900 dark:text-white font-medium text-sm">
                                            {[stock.city, stock.state, stock.country].filter(Boolean).join(', ') || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {stock.website && (
                                    <a href={stock.website} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-bold">
                                        <Globe size={16} /> Visit Official Website
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'State' && (
                        <div className="px-6 space-y-6">
                            <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-6 border border-gray-200 dark:border-zinc-800">
                                <h3 className="font-bold mb-4 uppercase text-xs tracking-widest text-gray-500 dark:text-zinc-500">
                                    Income Statement Flow {analysis.incomeStatement?.date ? `(FY ${new Date(analysis.incomeStatement.date * 1000).getFullYear()})` : ''}
                                </h3>

                                {analysis.incomeStatement ? (() => {
                                    const inc = analysis.incomeStatement;

                                    // Utility to safely cast to number
                                    const safeVal = (v: any) => {
                                        let n = Number(v);
                                        if (isNaN(n) && v && typeof v === 'object' && 'raw' in v) {
                                            n = Number(v.raw);
                                        }
                                        return isNaN(n) ? 0 : Math.max(0, n);
                                    };

                                    // Get raw values
                                    const totalRev = safeVal(inc.totalRevenue);
                                    const netInc = safeVal(inc.netIncome);
                                    const tax = safeVal(inc.incomeTaxExpense);
                                    const interestExp = safeVal(inc.interestExpense);

                                    // Get or calculate intermediate values
                                    // If Yahoo Finance doesn't provide them, estimate based on typical margins
                                    let costRev = safeVal(inc.costOfRevenue);
                                    let opExp = safeVal(inc.operatingExpenses);

                                    // If cost of revenue is 0, estimate: typically 50-60% of revenue for tech
                                    if (costRev === 0 && totalRev > 0) {
                                        // Calculate: Revenue - Net Income - Tax gives us total costs
                                        const totalCosts = totalRev - netInc - tax;
                                        // Split roughly 70% to cost of revenue, 30% to operating expenses
                                        costRev = Math.max(0, totalCosts * 0.65);
                                        opExp = Math.max(0, totalCosts * 0.20);
                                    }

                                    const grossProf = Math.max(0, totalRev - costRev);
                                    const opInc = Math.max(0, grossProf - opExp);

                                    // Valid Data Check
                                    if (totalRev === 0) {
                                        return (
                                            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
                                                <p>Insufficient data to visualize flow.</p>
                                            </div>
                                        );
                                    }

                                    // Balance - Other = what's left after tax+net+interest
                                    const opIncomeOutflow = tax + netInc + interestExp;
                                    const other = Math.max(0, opInc - opIncomeOutflow);

                                    // Colors: Grey=neutral, Red/Pink=costs, Green=profits
                                    const cGrey = '#6b7280';
                                    const cRed = '#f87171';
                                    const cGreen = '#34d399';
                                    const cPink = '#fb7185';

                                    // Build nodes array for D3 Sankey
                                    const nodes = [
                                        { name: 'Revenue', value: totalRev, color: cGrey },           // 0
                                        { name: 'Cost of Revenue', value: costRev, color: cPink },   // 1
                                        { name: 'Gross Profit', value: grossProf, color: cGreen },   // 2
                                        { name: 'Operating Exp.', value: opExp, color: cPink },      // 3
                                        { name: 'Operating Income', value: opInc, color: cGreen },   // 4
                                        { name: 'Tax', value: tax, color: cRed },                    // 5
                                        { name: 'Net Income', value: netInc, color: '#10b981' },     // 6 - Emerald
                                        { name: 'Interest', value: interestExp, color: cPink },      // 7
                                        { name: 'Other', value: other, color: cGrey },               // 8
                                    ];

                                    // Build links array
                                    const links = [];
                                    if (costRev > 0) links.push({ source: 0, target: 1, value: costRev });
                                    if (grossProf > 0) links.push({ source: 0, target: 2, value: grossProf });
                                    if (opExp > 0) links.push({ source: 2, target: 3, value: opExp });
                                    if (opInc > 0) links.push({ source: 2, target: 4, value: opInc });
                                    if (interestExp > 0) links.push({ source: 4, target: 7, value: interestExp });
                                    if (tax > 0) links.push({ source: 4, target: 5, value: tax });
                                    if (netInc > 0) links.push({ source: 4, target: 6, value: netInc });
                                    if (other > 0) links.push({ source: 4, target: 8, value: other });

                                    // Filter nodes that have no connections
                                    const usedNodes = new Set<number>();
                                    links.forEach(l => {
                                        usedNodes.add(l.source);
                                        usedNodes.add(l.target);
                                    });

                                    // Remap indices for only used nodes
                                    const filteredNodes = nodes.filter((_, i) => usedNodes.has(i));
                                    const indexMap: Record<number, number> = {};
                                    let newIdx = 0;
                                    nodes.forEach((n, oldIdx) => {
                                        if (usedNodes.has(oldIdx)) {
                                            indexMap[oldIdx] = newIdx++;
                                        }
                                    });

                                    const remappedLinks = links.map(l => ({
                                        source: indexMap[l.source],
                                        target: indexMap[l.target],
                                        value: l.value
                                    }));

                                    if (remappedLinks.length === 0) {
                                        return (
                                            <div className="h-64 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
                                                <p>No significant flow to display.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <SankeyChart
                                            nodes={filteredNodes}
                                            links={remappedLinks}
                                            currency={stock.currency}
                                        />
                                    );
                                })() : (
                                    <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
                                        {loadingAnalysis ? <Loader2 className="animate-spin mb-2" /> : <p>No income statement data available.</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default StockDetailView;