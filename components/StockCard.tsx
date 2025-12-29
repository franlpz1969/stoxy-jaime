import React, { useMemo, useState, useEffect } from 'react';
import { PortfolioPosition } from '../types';
import Sparkline from './Sparkline';
import { Clock, AlignJustify, Trash2, AlertTriangle } from 'lucide-react';

interface StockCardProps {
  position: PortfolioPosition;
  onOpenTransactions: () => void;
  onRemove: () => void;
  onSelect: () => void;
  showBalance?: boolean;
  language?: string;
  // Currency Settings
  displayCurrency?: string;
  exchangeRate?: number;
}

const StockCard: React.FC<StockCardProps> = ({ 
  position, 
  onOpenTransactions, 
  onRemove, 
  onSelect, 
  showBalance = true, 
  language = 'en',
  displayCurrency = 'USD',
  exchangeRate = 1.0
}) => {
  const { stock, transactions, userCurrency } = position;
  
  // Robust Logo Handling
  const [logoSrc, setLogoSrc] = useState(stock.logoUrl);
  const [logoError, setLogoError] = useState(false);
  
  // Delete Confirmation State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setLogoSrc(stock.logoUrl);
    setLogoError(false);
  }, [stock.logoUrl]);

  const handleLogoError = () => {
    if (logoSrc && logoSrc.includes('logo.clearbit.com')) {
        const domain = logoSrc.split('/').pop();
        setLogoSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    } else {
        setLogoError(true);
    }
  };

  // --- HANDLERS ---
  const handleDeleteClick = (e: React.MouseEvent) => {
    // Stop event bubbling so card doesn't open details
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove(); // Execute actual removal
    setIsDeleteConfirmOpen(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleteConfirmOpen(false);
  };

  const preventBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleTransactions = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenTransactions();
  };

  // --- CALCULATIONS ---
  const { totalShares, totalCost } = useMemo(() => {
    let shares = 0;
    let cost = 0;
    transactions.forEach(tx => {
      if (tx.type === 'BUY') {
        shares += tx.shares;
        cost += tx.shares * tx.price;
      } else {
        if (shares > 0) {
           const avgCost = cost / shares;
           cost -= tx.shares * avgCost;
           shares -= tx.shares;
        }
      }
    });
    return { totalShares: shares, totalCost: cost };
  }, [transactions]);

  // Current price in Native Currency of the stock
  const currentPriceNative = stock.currentPrice ?? 0;
  
  // Calculate Base values (USD assumed for base in this demo app context)
  const currentValueBase = totalShares * currentPriceNative;
  const totalCostBase = totalCost; // Assuming transaction price matches stock base price
  
  // --- CONVERSION ---
  // Apply exchange rate to values for display
  const currentValueDisplay = currentValueBase * exchangeRate;
  const totalCostDisplay = totalCostBase * exchangeRate;
  
  const totalProfitDisplay = currentValueDisplay - totalCostDisplay;
  const totalProfitPercent = totalCostDisplay > 0 ? (totalProfitDisplay / totalCostDisplay) * 100 : 0;
  
  const dayChangePercent = stock.dayChangePercent ?? 0;
  
  // Calculate daily profit in display currency
  const prevValueBase = currentValueBase / (1 + (dayChangePercent / 100));
  const dailyProfitBase = currentValueBase - prevValueBase;
  const dailyProfitDisplay = dailyProfitBase * exchangeRate;

  const isPositiveDay = dayChangePercent >= 0;
  const isPositiveTotal = totalProfitDisplay >= 0;

  // --- FORMATTERS ---
  const getCurrencySymbol = (code: string) => {
    if (code === 'EUR') return '€';
    if (code === 'GBP') return '£';
    if (code === 'JPY') return '¥';
    return '$';
  };
  
  // Symbol for the global display currency
  const displaySymbol = getCurrencySymbol(displayCurrency);
  // Symbol for the native stock price
  const nativeSymbol = getCurrencySymbol(stock.currency || 'USD');

  const fmtCurrency = (val: number, symbol: string) => {
    const sign = val >= 0 ? '+' : '-';
    const absVal = Math.abs(val);
    return `${sign}${symbol}${absVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fmtPlain = (val: number, symbol: string) => {
    return `${symbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const privacyClass = showBalance ? '' : 'blur-sm select-none opacity-50';

  return (
    <div 
        onClick={onSelect}
        className="bg-[#18181b] rounded-3xl p-5 relative overflow-hidden shadow-lg border border-zinc-800/50 group/card select-none cursor-pointer hover:border-zinc-700 transition-colors"
    >
        
        {/* --- CONFIRMATION OVERLAY --- */}
        {isDeleteConfirmOpen && (
            <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-3">
                    <AlertTriangle size={20} />
                </div>
                <h4 className="text-white font-bold text-base mb-1">
                    {language === 'es' ? '¿Eliminar activo?' : 'Delete Asset?'}
                </h4>
                <p className="text-zinc-400 text-[10px] mb-4 max-w-[200px] leading-relaxed">
                    {language === 'es' 
                        ? 'Esta acción no se puede deshacer.' 
                        : 'This action cannot be undone.'}
                </p>
                <div className="flex gap-3 w-full px-2">
                    <button 
                        onClick={handleCancelDelete}
                        className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold text-xs text-white transition-colors"
                    >
                        {language === 'es' ? 'Cancelar' : 'Cancel'}
                    </button>
                    <button 
                        onClick={handleConfirmDelete}
                        className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xs text-white transition-colors"
                    >
                        {language === 'es' ? 'Eliminar' : 'Delete'}
                    </button>
                </div>
            </div>
        )}

        {/* Header Row */}
        <div className="flex justify-between items-start mb-1 relative z-10">
            {/* Left: Logo & Company Name */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {logoSrc && !logoError ? (
                        <img 
                            src={logoSrc} 
                            alt={stock.symbol} 
                            className="w-full h-full object-contain"
                            onError={handleLogoError}
                        />
                    ) : (
                        <span className="text-black font-bold text-xs">{stock.symbol.substring(0,2).toUpperCase()}</span>
                    )}
                </div>
                <h3 className="font-bold text-lg text-white truncate max-w-[140px] leading-none tracking-tight group-hover/card:text-blue-400 transition-colors">
                    {stock.companyName}
                </h3>
            </div>

            {/* Center: Sparkline (Absolute positioned to match the look) */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2 w-20 h-8 opacity-80 hidden sm:block pointer-events-none">
                 <Sparkline isPositive={isPositiveDay} />
            </div>

            {/* Right: Price (Kept in Native Currency usually, but let's show in Native for clarity of stock price) */}
            <div className="text-right">
                <div className="text-xl font-bold text-white tracking-tight">
                    {fmtPlain(currentPriceNative, nativeSymbol)}
                </div>
                <div className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold mt-1 ${isPositiveDay ? 'bg-[#22c55e] text-white' : 'bg-[#ef4444] text-white'}`}>
                    {dayChangePercent.toFixed(2)}%
                </div>
            </div>
        </div>

        {/* Sub-Header: Ticker */}
        <div className="flex items-center gap-2 mb-4 ml-[52px]">
             <Clock size={14} className="text-[#22c55e]" strokeWidth={2.5} />
             <span className="text-zinc-400 font-bold text-xs tracking-wide">{stock.symbol}</span>
        </div>

        {/* Stats Grid - Converted to Display Currency */}
        <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1 mb-4">
            {/* Row 1: Daily */}
            <div className="text-zinc-500 font-medium text-sm">Daily</div>
            <div className={`text-right font-bold text-sm ${dailyProfitDisplay >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'} ${privacyClass}`}>
                 {fmtCurrency(dailyProfitDisplay, displaySymbol)}
            </div>
            <div className={`text-right font-bold text-sm ${isPositiveDay ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                 {dayChangePercent.toFixed(2)}%
            </div>

            {/* Row 2: Total */}
            <div className="text-zinc-500 font-medium text-sm">Total</div>
            <div className={`text-right font-bold text-sm ${isPositiveTotal ? 'text-[#4ade80]' : 'text-[#f87171]'} ${privacyClass}`}>
                 {fmtCurrency(totalProfitDisplay, displaySymbol)}
            </div>
             <div className={`text-right font-bold text-sm ${isPositiveTotal ? 'text-[#4ade80]' : 'text-[#f87171]'} ${privacyClass}`}>
                 +{totalProfitPercent.toFixed(2)}%
            </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-end mt-2 relative z-20">
            <div className="flex items-center gap-3">
                <button 
                    type="button"
                    onClick={handleTransactions}
                    onMouseDown={preventBubble}
                    className="flex items-center gap-2 text-[#60a5fa] font-bold text-xs uppercase tracking-wider hover:text-white transition-colors group/btn relative z-30"
                >
                    <AlignJustify size={20} className="group-hover/btn:scale-110 transition-transform" />
                    TRANSACTIONS
                </button>
                
                {/* TRASH BUTTON - High Z-Index to ensure clickability */}
                <button 
                    type="button"
                    onClick={handleDeleteClick}
                    onMouseDown={preventBubble}
                    onMouseUp={preventBubble}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 text-zinc-500 hover:text-red-500 hover:border-red-500 hover:bg-red-500/10 transition-all active:scale-95 ml-2 relative z-50 cursor-pointer"
                    title="Remove Asset"
                >
                    <Trash2 size={18} />
                </button>
            </div>
            
            <div className="text-right">
                {/* Current Value in Display Currency */}
                <div className={`text-2xl font-bold text-white tracking-tighter transition-all ${privacyClass}`}>
                    {fmtPlain(currentValueDisplay, displaySymbol)}
                </div>
                <div className="text-right text-zinc-400 text-sm font-bold">{totalShares.toLocaleString()}</div>
            </div>
        </div>

    </div>
  );
};

export default StockCard;