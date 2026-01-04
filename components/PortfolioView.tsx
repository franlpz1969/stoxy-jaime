import React, { useState, useRef, useEffect } from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, User, Eye, EyeOff, ChevronDown, Check, FolderPlus, Trash2, HelpCircle } from 'lucide-react';
import StockCard from './StockCard';
import { PortfolioPosition, StockData, Portfolio } from '../types';

interface PortfolioViewProps {
    portfolios?: Portfolio[]; // List of all portfolios
    activePortfolioId?: string;
    onSwitchPortfolio?: (id: string) => void;
    onCreatePortfolio?: (name: string) => void;
    onDeletePortfolio?: (id: string) => void;
    portfolio: PortfolioPosition[]; // The current active items
    totalValue: number;
    totalProfit: number;
    totalProfitPercent: number;
    dayChangeValue: number;
    onOpenAddModal: () => void;
    onOpenTransactions: (id: string) => void;
    onRemovePosition: (id: string) => void;
    onOpenSettings: () => void;
    onSelectStock: (stock: StockData) => void;
    onAnalyzePortfolio?: () => void; // New Prop
    language: string;
    // Currency
    currentCurrency: string;
    onCurrencyChange: (currency: string) => void;
    exchangeRate: number;
}

const PortfolioView: React.FC<PortfolioViewProps> = ({
    portfolios = [],
    activePortfolioId,
    onSwitchPortfolio,
    onCreatePortfolio,
    onDeletePortfolio,
    portfolio,
    totalValue,
    totalProfit,
    totalProfitPercent,
    dayChangeValue,
    onOpenAddModal,
    onOpenTransactions,
    onRemovePosition,
    onOpenSettings,
    onSelectStock,
    onAnalyzePortfolio,
    language,
    currentCurrency,
    onCurrencyChange,
    exchangeRate
}) => {
    const t = (en: string, es: string) => language === 'es' ? es : en;
    const [showBalance, setShowBalance] = useState(true);

    // Dropdown States
    const [isPortfolioMenuOpen, setIsPortfolioMenuOpen] = useState(false);
    const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const menuRef = useRef<HTMLDivElement>(null);
    const currencyMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsPortfolioMenuOpen(false);
                setIsCreating(false);
            }
            if (currencyMenuRef.current && !currencyMenuRef.current.contains(event.target as Node)) {
                setIsCurrencyMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPortfolioName.trim() && onCreatePortfolio) {
            onCreatePortfolio(newPortfolioName);
            setNewPortfolioName('');
            setIsCreating(false);
            setIsPortfolioMenuOpen(false);
        }
    };

    const getCurrencySymbol = (code: string) => {
        if (code === 'EUR') return '€';
        if (code === 'GBP') return '£';
        if (code === 'JPY') return '¥';
        return '$';
    };

    const activePortfolioName = portfolios.find(p => p.id === activePortfolioId)?.name || t('Portfolio', 'Portafolio');
    const currencySymbol = getCurrencySymbol(currentCurrency);

    const AVAILABLE_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

    return (
        <div className="pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Actions */}
            <div className="flex justify-between items-center py-4 mb-2 px-4 relative z-50">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onOpenSettings}
                        className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-400 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-white flex items-center justify-center transition-colors shadow-sm"
                    >
                        <User size={20} />
                    </button>

                    {/* PORTFOLIO SELECTOR DROPDOWN */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsPortfolioMenuOpen(!isPortfolioMenuOpen)}
                            className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-900 p-2 rounded-xl transition-colors -ml-2"
                        >
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate max-w-[180px] sm:max-w-xs text-gray-900 dark:text-white">{activePortfolioName}</h1>
                            <ChevronDown size={20} className={`text-gray-500 dark:text-zinc-500 transition-transform duration-300 ${isPortfolioMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isPortfolioMenuOpen && (
                            <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]">
                                <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    <div className="px-3 py-2 text-xs font-bold text-gray-500 dark:text-zinc-500 uppercase">Switch Portfolio</div>
                                    {portfolios.map(p => (
                                        <div key={p.id} className={`group flex items-center justify-between w-full rounded-xl transition-colors ${activePortfolioId === p.id ? 'bg-blue-50 dark:bg-blue-600/10' : 'hover:bg-gray-100 dark:hover:bg-zinc-800'}`}>
                                            <button
                                                onClick={() => {
                                                    if (onSwitchPortfolio) onSwitchPortfolio(p.id);
                                                    setIsPortfolioMenuOpen(false);
                                                }}
                                                className={`flex-1 text-left px-3 py-3 flex items-center justify-between ${activePortfolioId === p.id ? 'text-blue-600 dark:text-blue-500' : 'text-gray-700 dark:text-zinc-300'}`}
                                            >
                                                <span className="font-bold truncate">{p.name}</span>
                                                {activePortfolioId === p.id && <Check size={16} />}
                                            </button>
                                            {portfolios.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (onDeletePortfolio) onDeletePortfolio(p.id);
                                                    }}
                                                    className="p-3 text-gray-400 dark:text-zinc-600 hover:text-red-500 transition-colors"
                                                    title="Delete Portfolio"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-zinc-800 p-2 bg-zinc-900/50">
                                    {isCreating ? (
                                        <form onSubmit={handleCreateSubmit} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newPortfolioName}
                                                onChange={(e) => setNewPortfolioName(e.target.value)}
                                                placeholder="Name..."
                                                className="w-full bg-black border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white focus:border-blue-500 outline-none"
                                                autoFocus
                                            />
                                            <button
                                                type="submit"
                                                disabled={!newPortfolioName.trim()}
                                                className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                                            >
                                                Add
                                            </button>
                                        </form>
                                    ) : (
                                        <button
                                            onClick={() => setIsCreating(true)}
                                            className="w-full flex items-center gap-2 text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-sm font-bold"
                                        >
                                            <FolderPlus size={16} />
                                            Create New Portfolio
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI ANALYSIS BUTTON */}
                <button
                    onClick={onAnalyzePortfolio}
                    className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-white hover:border-blue-500 transition-all flex items-center justify-center group shadow-lg"
                    title="Analyze Portfolio with AI"
                >
                    <HelpCircle size={20} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* Dashboard Summary Card */}
            <div className="px-4 mb-8">
                <div className="bg-white dark:bg-gradient-to-br dark:from-[#1e1e24] dark:to-[#121214] border border-gray-200 dark:border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/20 blur-3xl rounded-full group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/30 transition-all"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 dark:text-zinc-400 text-base font-semibold tracking-wider uppercase">{t('Total Balance', 'Balance Total')}</span>
                                <button
                                    onClick={() => setShowBalance(!showBalance)}
                                    className="text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white transition-colors p-1"
                                >
                                    {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                            </div>

                            {/* CURRENCY SELECTOR */}
                            <div className="relative" ref={currencyMenuRef}>
                                <button
                                    onClick={() => setIsCurrencyMenuOpen(!isCurrencyMenuOpen)}
                                    className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 transition-colors text-sm font-bold text-gray-700 dark:text-zinc-300"
                                >
                                    <span>{currentCurrency}</span>
                                    <ChevronDown size={14} />
                                </button>

                                {isCurrencyMenuOpen && (
                                    <div className="absolute top-full right-0 mt-2 w-24 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-[60]">
                                        {AVAILABLE_CURRENCIES.map(curr => (
                                            <button
                                                key={curr}
                                                onClick={() => {
                                                    onCurrencyChange(curr);
                                                    setIsCurrencyMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 text-xs font-bold hover:bg-gray-100 dark:hover:bg-zinc-800 flex justify-between items-center ${currentCurrency === curr ? 'text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-gray-600 dark:text-zinc-400'}`}
                                            >
                                                {curr}
                                                {currentCurrency === curr && <Check size={12} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={`text-3xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mt-4 mb-4 tracking-tight transition-all duration-300 ${showBalance ? '' : 'blur-md select-none opacity-50'}`}>
                            {currencySymbol}{totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>

                        <div className="flex items-center gap-6 mt-8">
                            <div>
                                <span className="text-gray-500 dark:text-zinc-500 text-sm font-bold uppercase block mb-1">{t('24h Profit/Loss', '24h Ganancia/Pérdida')}</span>
                                <div className={`flex items-center gap-1 text-lg sm:text-xl font-semibold transition-all duration-300 ${showBalance ? (dayChangeValue >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400') : 'blur-sm select-none opacity-50 text-gray-400 dark:text-zinc-400'}`}>
                                    {showBalance && (dayChangeValue >= 0 ? <ArrowUpRight size={20} className="sm:w-6 sm:h-6" /> : <ArrowDownRight size={20} className="sm:w-6 sm:h-6" />)}
                                    {currencySymbol}{Math.abs(dayChangeValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="w-px h-12 bg-gray-200 dark:bg-zinc-800"></div>
                            <div>
                                <span className="text-gray-500 dark:text-zinc-500 text-sm font-bold uppercase block mb-1">{t('Total Profit', 'Ganancia Total')}</span>
                                <div className={`flex items-center gap-1 text-lg sm:text-xl font-semibold transition-all duration-300 ${showBalance ? (totalProfit >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400') : 'blur-sm select-none opacity-50 text-gray-400 dark:text-zinc-400'}`}>
                                    <span>{totalProfit >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(totalProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <span className="text-xs sm:text-sm opacity-70 ml-1">({totalProfitPercent.toFixed(2)}%)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Assets List */}
            <div className="px-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-zinc-200">{t('Your Assets', 'Tus Activos')}</h2>

                    {/* INLINE PLUS BUTTON */}
                    <button
                        onClick={onOpenAddModal}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-all border border-gray-200 dark:border-zinc-700 hover:border-blue-500 shadow-sm"
                    >
                        <Plus size={20} strokeWidth={3} />
                    </button>
                </div>
                <div className="space-y-4">
                    {portfolio.length === 0 ? (
                        <div className="py-16 text-center px-6 border border-zinc-800 rounded-3xl bg-[#151517]">
                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Wallet className="text-zinc-600" size={24} />
                            </div>
                            <h3 className="text-white font-bold mb-1">{t('Portfolio Empty', 'Portafolio Vacío')}</h3>
                            <p className="text-zinc-500 text-sm mb-6">{t('Start tracking your assets now.', 'Comienza a rastrear tus activos ahora.')}</p>
                            <button
                                onClick={onOpenAddModal}
                                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                            >
                                + {t('Add Asset (Symbol/ISIN)', 'Agregar Activo (Símbolo/ISIN)')}
                            </button>
                        </div>
                    ) : (
                        portfolio.map(pos => (
                            <StockCard
                                key={pos.id}
                                position={pos}
                                onOpenTransactions={() => onOpenTransactions(pos.id)}
                                onRemove={() => onRemovePosition(pos.id)}
                                onSelect={() => onSelectStock(pos.stock)}
                                showBalance={showBalance}
                                language={language}
                                displayCurrency={currentCurrency}
                                exchangeRate={exchangeRate}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Floating Add Button */}
            <div className="fixed bottom-24 right-5 z-40 md:bottom-10 md:right-10">
                <button
                    onClick={onOpenAddModal}
                    className="w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 text-white transition-transform hover:scale-105 active:scale-95"
                >
                    <Plus size={28} />
                </button>
            </div>
        </div>
    );
};

export default PortfolioView;