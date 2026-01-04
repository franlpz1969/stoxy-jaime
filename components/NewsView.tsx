
import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Lightbulb, TrendingUp, Loader2, Sparkles, Target, Calendar, AlertCircle, BarChart3, Zap, Globe, ShieldCheck, Layers, ArrowUpRight, Clock } from 'lucide-react';
import { InvestmentRecommendation } from '../types';
import { fetchInvestmentRecommendations, fetchMarketNews } from '../services/geminiService';

const NewsView = () => {
    const [activeSection, setActiveSection] = useState<'news' | 'recommendations'>('news');
    const [recommendations, setRecommendations] = useState<InvestmentRecommendation[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (activeSection === 'recommendations' && recommendations.length === 0) {
            loadRecommendations();
        }
    }, [activeSection]);

    const loadRecommendations = async () => {
        setLoadingRecs(true);
        setError(null);
        try {
            const data = await fetchInvestmentRecommendations();
            setRecommendations(data);
        } catch (err: any) {
            console.error("NewsView Error:", err);
            setError(err.message || "Error al conectar con la IA");
        } finally {
            setLoadingRecs(false);
        }
    };

    const [news, setNews] = useState<any[]>([]);
    const [loadingNews, setLoadingNews] = useState(false);

    useEffect(() => {
        if (activeSection === 'news' && news.length === 0) {
            const load = async () => {
                setLoadingNews(true);
                const data = await fetchMarketNews();
                setNews(data);
                setLoadingNews(false);
            };
            load();
        }
    }, [activeSection]);

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Low': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'Medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'High': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
        }
    };

    const [fontSize, setFontSize] = useState(1); // 0: Small, 1: Medium, 2: Large

    const fontConfig = [
        { title: 'text-base', body: 'text-xs', tag: 'text-[10px]' },     // Small
        { title: 'text-lg', body: 'text-sm', tag: 'text-xs' },           // Medium (Default)
        { title: 'text-2xl', body: 'text-base', tag: 'text-sm' }         // Large
    ];

    const currentFont = fontConfig[fontSize];

    return (
        <div className="p-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">

            {/* Header & Toggle Switch */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Intelligence</h1>

                    {/* Font Size Controls */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg border border-gray-200 dark:border-zinc-800">
                        <button
                            onClick={() => setFontSize(Math.max(0, fontSize - 1))}
                            className={`p-1.5 rounded-md transition-colors ${fontSize === 0 ? 'text-gray-300 dark:text-zinc-700 cursor-not-allowed' : 'text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm'}`}
                            disabled={fontSize === 0}
                        >
                            <span className="text-xs font-bold">A-</span>
                        </button>
                        <div className="w-px h-4 bg-gray-300 dark:bg-zinc-700 mx-1"></div>
                        <button
                            onClick={() => setFontSize(Math.min(2, fontSize + 1))}
                            className={`p-1.5 rounded-md transition-colors ${fontSize === 2 ? 'text-gray-300 dark:text-zinc-700 cursor-not-allowed' : 'text-gray-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm'}`}
                            disabled={fontSize === 2}
                        >
                            <span className="text-lg font-bold">A+</span>
                        </button>
                    </div>
                </div>

                <div className="bg-gray-200 dark:bg-zinc-900/50 p-1 rounded-xl border border-gray-300 dark:border-zinc-800 flex relative">
                    <button
                        onClick={() => setActiveSection('news')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all relative z-10 ${activeSection === 'news' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-zinc-700/50' : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        Market News
                    </button>
                    <button
                        onClick={() => setActiveSection('recommendations')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all relative z-10 ${activeSection === 'recommendations' ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-zinc-700/50' : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
                            }`}
                    >
                        Oportunidades
                    </button>
                </div>
            </div>

            {/* Content: News Tab */}
            {activeSection === 'news' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {loadingNews ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : (
                        news.map((item, i) => (
                            <a
                                key={i}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block bg-white dark:bg-[#151517] border border-gray-200 dark:border-zinc-800 rounded-2xl p-5 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer group shadow-sm"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <Clock size={12} className="text-gray-400 dark:text-zinc-600" />
                                        <span className="text-gray-500 dark:text-zinc-600 text-xs">{item.time}</span>
                                    </div>
                                    <div className={`bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 font-bold px-2 py-0.5 rounded uppercase ${currentFont.tag}`}>
                                        {item.tag}
                                    </div>
                                </div>
                                <h3 className={`text-gray-900 dark:text-white font-bold mb-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${currentFont.title}`}>
                                    {item.title}
                                </h3>
                                <p className={`text-gray-600 dark:text-zinc-500 line-clamp-3 leading-relaxed ${currentFont.body}`}>
                                    {item.snippet}
                                </p>
                                <div className="mt-5 flex items-center text-blue-600 dark:text-blue-500 font-bold text-sm uppercase tracking-wide group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                                    {item.source} <ExternalLink size={16} className="ml-1" />
                                </div>
                            </a>
                        ))
                    )}
                </div>
            )}

            {/* Content: Recommendations Tab */}
            {activeSection === 'recommendations' && (
                <div className="space-y-6 animate-in fade-in duration-500">

                    {/* Legend / Source Info */}
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-600/10 dark:to-blue-600/10 border border-green-200 dark:border-green-500/20 rounded-3xl p-6 flex items-center gap-5 shadow-lg">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-green-600/20 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0 shadow-sm dark:shadow-none">
                            <Target size={24} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Buy Now Analysis</h4>
                            <p className="text-gray-600 dark:text-zinc-500 text-xs leading-tight mt-1">Filtrando activos infravalorados y puntos de entrada tácticos inmediatos.</p>
                        </div>
                    </div>

                    {loadingRecs ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full animate-pulse"></div>
                                <Loader2 className="absolute inset-0 m-auto animate-spin text-blue-600 dark:text-blue-500" size={32} />
                            </div>
                            <div className="text-center">
                                <p className="text-gray-900 dark:text-white font-black text-xl">Buscando asimetrías de valor...</p>
                                <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1">Escaneando fundamentales y soportes técnicos</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-zinc-600">
                            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-100 dark:border-rose-500/20 shadow-lg">
                                <AlertCircle size={32} className="text-rose-500" />
                            </div>
                            <h3 className="font-bold text-2xl text-gray-900 dark:text-zinc-400 mb-2">Error de Conexión</h3>
                            <p className="text-base text-center max-w-xs text-gray-600 dark:text-zinc-600 leading-relaxed mb-6">
                                {error}
                            </p>
                            <button onClick={loadRecommendations} className="bg-gray-900 dark:bg-zinc-800 text-white px-8 py-3 rounded-2xl text-sm font-bold border border-gray-800 dark:border-zinc-700 shadow-xl hover:bg-gray-800 dark:hover:bg-zinc-700 transition-colors">Reintentar Conexión</button>
                        </div>
                    ) : recommendations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-gray-500 dark:text-zinc-600">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-gray-200 dark:border-zinc-800 shadow-lg">
                                <Lightbulb size={32} className="opacity-40" />
                            </div>
                            <h3 className="font-bold text-2xl text-gray-900 dark:text-zinc-400 mb-2">Evaluando Activos</h3>
                            <p className="text-base text-center max-w-xs text-gray-600 dark:text-zinc-600 leading-relaxed mb-6">
                                No se han encontrado oportunidades con margen de seguridad suficiente en este momento.
                            </p>
                            <button onClick={loadRecommendations} className="bg-gray-900 dark:bg-zinc-800 text-white px-8 py-3 rounded-2xl text-sm font-bold border border-gray-800 dark:border-zinc-700 shadow-xl">Reintentar Escaneo</button>
                        </div>
                    ) : (
                        <div className="space-y-8 pb-20">
                            {recommendations.map((rec, i) => (
                                <div key={i} className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-zinc-800 rounded-[2.5rem] p-8 hover:border-green-500/40 transition-all group relative overflow-hidden shadow-lg dark:shadow-none">

                                    {/* Entry Zone Badge */}
                                    <div className="absolute -top-4 -right-4 bg-green-600 text-white px-10 py-6 rotate-12 font-black text-[10px] uppercase tracking-widest shadow-xl flex flex-col items-center">
                                        <span className="mr-4">ENTRY</span>
                                        <span className="mr-4">ZONE</span>
                                    </div>

                                    {/* Top Header */}
                                    <div className="flex justify-between items-start mb-8 relative z-10">
                                        <div className="flex items-center gap-5">
                                            <div className="w-20 h-20 bg-white dark:bg-white rounded-3xl flex items-center justify-center overflow-hidden border border-gray-200 dark:border-zinc-800 shadow-lg">
                                                <img
                                                    src={rec.logoUrl || `https://logo.clearbit.com/${rec.ticker.toLowerCase()}.com`}
                                                    className="w-12 h-12 object-contain"
                                                    onError={(e) => {
                                                        const target = e.currentTarget;
                                                        // Fallback chain: LogoURL -> Clearbit Ticker -> UI Avatars (Initials)
                                                        if (target.src === rec.logoUrl && rec.logoUrl) {
                                                            target.src = `https://logo.clearbit.com/${rec.ticker.toLowerCase()}.com`;
                                                        } else {
                                                            target.src = `https://ui-avatars.com/api/?name=${rec.ticker}&background=random`;
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-gray-900 dark:text-white font-black text-4xl tracking-tighter">{rec.ticker}</h3>
                                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase border tracking-widest ${getRiskColor(rec.riskLevel)}`}>
                                                        {rec.riskLevel} Risk
                                                    </span>
                                                </div>
                                                <p className="text-gray-500 dark:text-zinc-500 font-bold text-base mt-1 uppercase tracking-wider">{rec.companyName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right pr-6 lg:pr-12">
                                            <div className="text-green-600 dark:text-[#22c55e] font-black text-4xl flex items-center justify-end gap-2">
                                                <Target size={30} />
                                                ${rec.suggestedBuyPrice.toFixed(2)}
                                            </div>
                                            <div className="text-gray-400 dark:text-zinc-600 text-xs font-black uppercase mt-1 tracking-widest">Precio Actual</div>
                                        </div>
                                    </div>

                                    {/* Core Valuation Grid */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                                        <div className="bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800/50 p-5 rounded-2xl text-center">
                                            <p className="text-gray-500 dark:text-zinc-600 text-xs font-black uppercase mb-1 tracking-tighter">P/E vs Hist</p>
                                            <p className="text-gray-900 dark:text-white font-bold font-mono text-xl">{rec.metrics.pe}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800/50 p-5 rounded-2xl text-center">
                                            <p className="text-gray-500 dark:text-zinc-600 text-xs font-black uppercase mb-1 tracking-tighter">PEG Ratio</p>
                                            <p className="text-gray-900 dark:text-white font-bold font-mono text-xl">{rec.metrics.peg}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800/50 p-5 rounded-2xl text-center">
                                            <p className="text-gray-500 dark:text-zinc-600 text-xs font-black uppercase mb-1 tracking-tighter">ROE %</p>
                                            <p className="text-gray-900 dark:text-white font-bold font-mono text-xl">{rec.metrics.roe}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800/50 p-5 rounded-2xl text-center">
                                            <p className="text-gray-500 dark:text-zinc-600 text-xs font-black uppercase mb-1 tracking-tighter">Deuda/Cap</p>
                                            <p className="text-gray-900 dark:text-white font-bold font-mono text-xl">{rec.metrics.debtToEquity}</p>
                                        </div>
                                    </div>

                                    {/* Detailed Analysis Panels */}
                                    <div className="space-y-4">

                                        {/* Fundamental Panel */}
                                        <div className="bg-blue-500/[0.03] border border-blue-500/10 p-6 rounded-3xl group/pnl hover:bg-blue-500/[0.05] transition-colors">
                                            <div className="flex items-center gap-3 mb-3 text-blue-500">
                                                <ShieldCheck size={20} />
                                                <h4 className="text-xs font-black uppercase tracking-[0.2em]">Tesis Fundamental (Moat & Valor)</h4>
                                            </div>
                                            <p className="text-gray-700 dark:text-zinc-400 text-base leading-relaxed">{rec.fundamentalThesis}</p>
                                        </div>

                                        {/* Technical Panel */}
                                        <div className="bg-emerald-500/[0.03] border border-emerald-500/10 p-6 rounded-3xl group/pnl hover:bg-emerald-500/[0.05] transition-colors">
                                            <div className="flex items-center gap-3 mb-3 text-emerald-500">
                                                <BarChart3 size={20} />
                                                <h4 className="text-xs font-black uppercase tracking-[0.2em]">Análisis Técnico & Soportes</h4>
                                            </div>
                                            <p className="text-gray-700 dark:text-zinc-400 text-base leading-relaxed">{rec.technicalAnalysis}</p>
                                        </div>

                                        {/* Sector & Catalysts Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-indigo-500/[0.03] border border-indigo-500/10 p-5 rounded-3xl">
                                                <div className="flex items-center gap-3 mb-3 text-indigo-400">
                                                    <Layers size={16} />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.1em]">Situación Sectorial</h4>
                                                </div>
                                                <p className="text-gray-600 dark:text-zinc-500 text-sm leading-relaxed">{rec.sectorTrends}</p>
                                            </div>
                                            <div className="bg-amber-500/[0.03] border border-amber-500/10 p-5 rounded-3xl">
                                                <div className="flex items-center gap-3 mb-3 text-amber-400">
                                                    <Zap size={16} />
                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.1em]">Próximos Catalizadores</h4>
                                                </div>
                                                <p className="text-gray-600 dark:text-zinc-500 text-sm leading-relaxed">{rec.companyCatalysts}</p>
                                            </div>
                                        </div>

                                        {/* Radar Valuation Panel - Highlighted if present */}
                                        {rec.valuationRadar && (
                                            <div className="bg-green-500/[0.05] border border-green-500/20 p-6 rounded-3xl border-dashed">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3 text-green-400">
                                                        <Target size={18} />
                                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Radar OscarYan 2.0</h4>
                                                    </div>
                                                    <span className="bg-green-500 text-black px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Matched</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <p className="text-zinc-600 text-[10px] font-black uppercase mb-1 tracking-tighter">Margen MM1000</p>
                                                        <p className="text-green-400 font-black text-xl">{rec.valuationRadar.marginMM1000}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-zinc-600 text-[10px] font-black uppercase mb-1 tracking-tighter">Estado PER vs Hist</p>
                                                        <p className="text-white font-bold text-sm">{rec.valuationRadar.peStatus}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Compact Historical Context Match */}
                                        {rec.historicalMatch && (
                                            <div className="bg-blue-500/[0.03] border border-blue-500/10 p-4 rounded-2xl mt-4">
                                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                                    <div className="flex items-center gap-2 text-blue-400 mr-2">
                                                        <Lightbulb size={14} className="fill-blue-400/20" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Analogía Histórica</span>
                                                    </div>
                                                    <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[9px] font-bold">
                                                        <span className="text-zinc-500 font-black mr-1 uppercase">Empresa:</span> {rec.historicalMatch.matchedCompany}
                                                    </span>
                                                    <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-[9px] font-bold">
                                                        <span className="text-zinc-500 font-black mr-1 uppercase">Momento:</span> {rec.historicalMatch.matchedDate}
                                                    </span>
                                                </div>

                                                <div className="space-y-2 text-xs leading-snug">
                                                    <p className="text-zinc-400 italic">
                                                        <span className="text-blue-400/60 font-black uppercase text-[9px] not-italic mr-1">Contexto:</span>
                                                        "{rec.historicalMatch.contextSimilarity}"
                                                    </p>
                                                    <p className="text-zinc-300 font-medium">
                                                        <span className="text-blue-400 font-black uppercase text-[9px] mr-1">Oportunidad:</span>
                                                        {rec.historicalMatch.justification}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Target & Date Footer */}
                                        <div className="flex justify-between items-center mt-6 pt-6 border-t border-zinc-900/80">
                                            <div className="flex items-center gap-3">
                                                <Calendar size={14} className="text-zinc-700" />
                                                <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Analysis Date: {rec.asOfDate}</span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <div className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Consensus Target</div>
                                                    <div className="text-white font-black text-xl">${rec.targetPrice.toFixed(0)}</div>
                                                </div>
                                                <div className="h-10 w-px bg-zinc-800"></div>
                                                <div className="text-right">
                                                    <div className="text-green-500 text-[9px] font-black uppercase tracking-widest">Potencial Upside</div>
                                                    <div className="text-green-400 font-black text-xl flex items-center gap-1">
                                                        <ArrowUpRight size={18} />
                                                        {(((rec.targetPrice / rec.suggestedBuyPrice) - 1) * 100).toFixed(1)}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            ))}

                            <div className="py-12 flex flex-col items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-gray-400 dark:text-zinc-700">
                                    <AlertCircle size={24} />
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-zinc-700 uppercase font-black tracking-[0.4em] text-center max-w-sm leading-relaxed">
                                    DISCLAIMER: ESTO NO ES ASESORÍA FINANCIERA. OPERAR EN BOLSA IMPLICA RIESGO DE CAPITAL.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NewsView;
