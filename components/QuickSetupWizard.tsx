import React, { useState, useRef } from 'react';
import { Rocket, Target, Globe2, ArrowRight, Check, Search, Loader2, Plus } from 'lucide-react';
import { searchSymbols, getCompanyLogo } from '../services/geminiService';

interface QuickSetupWizardProps {
    onCreatePortfolio: (name: string, currency: string, firstStock?: string) => void;
    language: string;
}

const QuickSetupWizard: React.FC<QuickSetupWizardProps> = ({ onCreatePortfolio, language }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedStock, setSelectedStock] = useState<any>(null);

    const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const t = (en: string, es: string) => language === 'es' ? es : en;

    const currencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' }
    ];

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        debounceTimeout.current = setTimeout(async () => {
            const results = await searchSymbols(query);
            setSearchResults(results.slice(0, 5));
            setIsSearching(false);
        }, 400);
    };

    const handleFinish = () => {
        if (name.trim()) {
            onCreatePortfolio(name, currency, selectedStock?.symbol);
        }
    };

    return (
        <div className="max-w-md mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[40px] p-8 shadow-2xl border border-gray-100 dark:border-white/5 relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full" />

                {/* Header */}
                <div className="relative z-10 mb-8 text-center">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 rotate-3">
                        <Rocket size={32} className="text-blue-500" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                        {t('Quick Setup', 'Configuración Rápida')}
                    </h2>
                </div>

                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-zinc-800'}`} />
                    <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-zinc-800'}`} />
                    <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-zinc-800'}`} />
                </div>

                {/* Steps */}
                <div className="relative min-h-[320px]">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 flex items-center gap-2">
                                    <Target size={14} />
                                    {t('Portfolio Name', 'Nombre de la Cartera')}
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('e.g. My Long Term', 'ej. Mi Largo Plazo')}
                                    className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-all font-bold text-lg"
                                    autoFocus
                                />
                            </div>
                            <p className="text-sm text-gray-400 dark:text-zinc-500">
                                {t('This helps you organize your goals.', 'Esto te ayuda a organizar tus metas.')}
                            </p>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 flex items-center gap-2">
                                    <Globe2 size={14} />
                                    {t('Main Currency', 'Moneda Principal')}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {currencies.map((curr) => (
                                        <button
                                            key={curr.code}
                                            onClick={() => setCurrency(curr.code)}
                                            className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-1 ${currency === curr.code
                                                ? 'bg-blue-500 border-blue-600 text-white shadow-lg'
                                                : 'bg-gray-50 dark:bg-black border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400'
                                                }`}
                                        >
                                            <span className="text-2xl font-black">{curr.symbol}</span>
                                            <span className="text-xs font-bold">{curr.code}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500 flex items-center gap-2">
                                    <Search size={14} />
                                    {t('First Asset (Optional)', 'Primer Activo (Opcional)')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={selectedStock ? selectedStock.symbol : searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        disabled={!!selectedStock}
                                        placeholder={t('Search Ticker (AAPL, BTC...)', 'Buscar Ticket (AAPL, BTC...)')}
                                        className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-all font-bold"
                                    />
                                    {isSearching && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />}
                                    {selectedStock && (
                                        <button
                                            onClick={() => { setSelectedStock(null); setSearchQuery(''); }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-red-500 hover:text-red-400"
                                        >
                                            {t('Change', 'Cambiar')}
                                        </button>
                                    )}
                                </div>

                                {/* Search Results */}
                                {!selectedStock && searchResults.length > 0 && (
                                    <div className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-zinc-900">
                                        {searchResults.map((item) => (
                                            <button
                                                key={item.symbol}
                                                onClick={() => setSelectedStock(item)}
                                                className="w-full px-4 py-3 text-left hover:bg-blue-500/5 flex items-center justify-between group transition-colors"
                                            >
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={item.logo || getCompanyLogo(item.symbol)}
                                                            alt={item.symbol}
                                                            className="w-full h-full object-contain"
                                                            onError={(e) => {
                                                                const target = e.currentTarget;
                                                                if (target.src.includes('img.logo.dev') || target.src.includes('raw.githubusercontent.com')) {
                                                                    target.src = `https://logo.clearbit.com/${item.symbol.toLowerCase()}.com`;
                                                                } else if (target.src.includes('logo.clearbit.com')) {
                                                                    target.src = `https://www.google.com/s2/favicons?domain=${item.symbol.toLowerCase()}.com&sz=128`;
                                                                } else {
                                                                    target.style.display = 'none';
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">{item.symbol}</div>
                                                        <div className="text-xs text-gray-500 truncate">{item.description}</div>
                                                    </div>
                                                </div>
                                                <Plus size={16} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <p className="text-sm text-gray-400 dark:text-zinc-500">
                                {t('You can add this asset later if you prefer.', 'Puedes añadir este activo más tarde si prefieres.')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-8 flex gap-3">
                    {step > 1 && (
                        <button
                            onClick={() => setStep(step - 1)}
                            className="px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            {t('Back', 'Atrás')}
                        </button>
                    )}
                    <button
                        onClick={() => step < 3 ? setStep(step + 1) : handleFinish()}
                        disabled={step === 1 && !name.trim()}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl py-4 px-6 font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-600/30 active:scale-95 group"
                    >
                        <span>{step === 3 ? t('Ready!', '¡Listo!') : t('Next', 'Siguiente')}</span>
                        {step === 3 ? <Check size={20} /> : <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
                    </button>
                </div>
            </div>

            <p className="text-center mt-8 text-[10px] text-gray-400 dark:text-zinc-600 font-bold uppercase tracking-widest">
                Premium Ecosystem Access • Secured by Google Cloud
            </p>
        </div>
    );
};

export default QuickSetupWizard;
