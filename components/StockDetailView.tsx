import React, { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Bell, Star, TrendingUp, TrendingDown, Clock, Newspaper, Share2, Info, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { StockData, AnalysisData } from '../types';
import { fetchAnalysisData, fetchStockHistory, fetchStockData } from '../services/geminiService';

interface StockDetailViewProps {
    stock: StockData;
    onClose: () => void;
    language?: string;
}

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'];
const TABS = ['Chart', 'Rates', 'News', 'Notes', 'Analysis'];

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
        }
    }, [activeTab, stock.symbol]);

    const previousClose = stock.previousClose || (stock.currentPrice / (1 + (stock.dayChangePercent || 0) / 100));
    const absChange = stock.currentPrice - previousClose;
    const pctChange = previousClose !== 0 ? (absChange / previousClose) * 100 : 0;
    const isPositive = absChange >= 0;
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
                    {activeTab === 'Rates' && (
                        <div className="px-6 space-y-6">
                            <h3 className="text-white font-bold text-lg hidden">Key Statistics</h3>
                            <div className="border-t border-zinc-900">
                                <TableRow labelEs="CIERRE ANTERIOR" labelEn="Previous Close" value={stock.previousClose?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + stock.currency} />
                                <TableRow labelEs="INTERVALO DIARIO" labelEn="Day Range" value={stock.dayLow && stock.dayHigh ? `${stock.dayLow.toLocaleString(undefined, { minimumFractionDigits: 2 })} - ${stock.dayHigh.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'N/A'} />
                                <TableRow labelEs="INTERVALO ANUAL" labelEn="Year Range" value={stock.fiftyTwoWeekLow && stock.fiftyTwoWeekHigh ? `${stock.fiftyTwoWeekLow.toLocaleString(undefined, { minimumFractionDigits: 2 })} - ${stock.fiftyTwoWeekHigh.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'N/A'} />
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
                                        <div className="h-48">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analysis.recommendationTrend} layout="vertical">
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="period" type="category" tick={{ fill: '#71717a', fontSize: 10 }} width={30} axisLine={false} />
                                                    <Bar dataKey="strongBuy" stackId="a" fill="#22c55e" />
                                                    <Bar dataKey="buy" stackId="a" fill="#84cc16" />
                                                    <Bar dataKey="hold" stackId="a" fill="#eab308" />
                                                    <Bar dataKey="sell" stackId="a" fill="#ef4444" />
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
                                        <div className="h-1.5 w-full bg-zinc-800 rounded-full flex overflow-hidden">
                                            <div className="h-full bg-green-500" style={{ width: analysis.analystRating ? `${(5 - analysis.analystRating) * 20}%` : '0%' }}></div>
                                        </div>
                                        <div className="flex justify-between mt-2 text-[10px] font-bold uppercase text-zinc-600">
                                            <span>Strong Buy</span><span>Hold</span><span>Sell</span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {activeTab === 'Notes' && (
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