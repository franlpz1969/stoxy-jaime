import React, { useMemo, useState, useEffect } from 'react';
import { PortfolioPosition } from '../types';
import Sparkline from './Sparkline';
import { Clock, AlignJustify, Trash2, AlertTriangle } from 'lucide-react';
import { getCompanyLogo } from '../services/geminiService';

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

  // Dynamic Logo Logic
  const dynamicLogo = useMemo(() => getCompanyLogo(stock.symbol, stock.website), [stock.symbol, stock.website]);
  const [logoSrc, setLogoSrc] = useState(dynamicLogo);
  const [logoError, setLogoError] = useState(false);

  // Delete Confirmation State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    setLogoSrc(dynamicLogo);
    setLogoError(false);
  }, [dynamicLogo]);

  const handleLogoError = () => {
    // If our primary dynamic URL fails, fallback to simple favicon query
    if (logoSrc && !logoSrc.includes('google.com/s2/favicons')) {
      const cleanTicker = stock.symbol.split('.')[0].toLowerCase();
      setLogoSrc(`https://www.google.com/s2/favicons?domain=${cleanTicker}.com&sz=128`);
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
        shares = Math.round(shares * 100000) / 100000;
        cost += tx.shares * tx.price;
      } else {
        if (shares > 0) {
          const avgCost = cost / shares;
          shares -= tx.shares;
          shares = Math.round(shares * 100000) / 100000;
          cost -= tx.shares * avgCost;
          if (shares <= 0) { shares = 0; cost = 0; }
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
      className="bg-white dark:bg-[#18181b] rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-lg border border-gray-200 dark:border-zinc-800/50 group/card select-none cursor-pointer hover:border-blue-500 dark:hover:border-zinc-700 transition-colors"
    >

      {/* --- CONFIRMATION OVERLAY --- */}
      {isDeleteConfirmOpen && (
        <div className="absolute inset-0 z-[60] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-4">
            <AlertTriangle size={24} />
          </div>
          <h4 className="text-white font-bold text-lg mb-2">
            {language === 'es' ? '¿Eliminar activo?' : 'Delete Asset?'}
          </h4>
          <p className="text-zinc-400 text-xs mb-6 max-w-[240px] leading-relaxed">
            {language === 'es'
              ? 'Esta acción no se puede deshacer.'
              : 'This action cannot be undone.'}
          </p>
          <div className="flex gap-4 w-full px-4">
            <button
              onClick={handleCancelDelete}
              className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-bold text-sm text-white transition-colors"
            >
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              onClick={handleConfirmDelete}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-2xl font-bold text-sm text-white transition-colors"
            >
              {language === 'es' ? 'Eliminar' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Header Row */}
      <div className="flex justify-between items-start mb-2 relative z-10">
        {/* Left: Logo & Company Name */}
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="w-12 h-12 rounded-full bg-white border border-gray-100 dark:border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            {logoSrc && !logoError ? (
              <img
                src={logoSrc}
                alt={stock.symbol}
                className="w-full h-full object-contain"
                onError={handleLogoError}
              />
            ) : (
              <span className="text-black font-bold text-sm">{stock.symbol.substring(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-condensed font-bold text-lg sm:text-2xl text-gray-900 dark:text-white truncate leading-tight tracking-tighter group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors">
              {stock.companyName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-500 dark:text-zinc-400 font-bold text-base tracking-wide">{stock.symbol}</span>
              {/* Sparkline hidden on mobile, visible on desktop */}
              <div className="w-20 h-8 opacity-60 hidden sm:block pointer-events-none">
                <Sparkline isPositive={isPositiveDay} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Price */}
        <div className="text-right shrink-0 ml-3">
          <div className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            {fmtPlain(currentPriceNative, nativeSymbol)}
          </div>
          <div className={`inline-block px-2 py-0.5 rounded text-sm sm:text-base font-bold mt-1 ${isPositiveDay ? 'bg-green-100 text-green-700 dark:bg-[#22c55e] dark:text-white' : 'bg-red-100 text-red-700 dark:bg-[#ef4444] dark:text-white'}`}>
            {dayChangePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Stats Grid - Responsive Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-[auto_1fr_auto] gap-x-2 sm:gap-x-6 gap-y-3 mb-5 mt-4 bg-gray-50 dark:bg-zinc-900/30 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
        {/* Row 1: Daily */}
        <div className="text-gray-500 dark:text-zinc-500 font-medium text-sm self-center">Daily P/L</div>
        <div className={`text-right sm:text-right font-bold text-base sm:text-lg ${dailyProfitDisplay >= 0 ? 'text-green-600 dark:text-[#4ade80]' : 'text-red-600 dark:text-[#f87171]'} ${privacyClass}`}>
          {fmtCurrency(dailyProfitDisplay, displaySymbol)}
        </div>
        <div className={`text-right font-bold text-base sm:text-lg hidden sm:block ${isPositiveDay ? 'text-green-600 dark:text-[#4ade80]' : 'text-red-600 dark:text-[#f87171]'}`}>
          {dayChangePercent.toFixed(2)}%
        </div>

        {/* Row 2: Total */}
        <div className="text-gray-500 dark:text-zinc-500 font-medium text-sm self-center">Total P/L</div>
        <div className={`text-right sm:text-right font-bold text-base sm:text-lg ${isPositiveTotal ? 'text-green-600 dark:text-[#4ade80]' : 'text-red-600 dark:text-[#f87171]'} ${privacyClass}`}>
          {fmtCurrency(totalProfitDisplay, displaySymbol)}
        </div>
        <div className={`text-right font-bold text-base sm:text-lg hidden sm:block ${isPositiveTotal ? 'text-green-600 dark:text-[#4ade80]' : 'text-red-600 dark:text-[#f87171]'} ${privacyClass}`}>
          +{totalProfitPercent.toFixed(2)}%
        </div>

        {/* Mobile Only: Extra row for percentages */}
        <div className="col-span-2 flex justify-between sm:hidden border-t border-gray-200 dark:border-white/5 pt-2 mt-1">
          <span className={`text-sm font-bold ${isPositiveDay ? 'text-green-600 dark:text-[#4ade80]' : 'text-red-600 dark:text-[#f87171]'}`}>D: {dayChangePercent.toFixed(2)}%</span>
          <span className={`text-sm font-bold ${isPositiveTotal ? 'text-green-600 dark:text-[#4ade80]' : 'text-red-600 dark:text-[#f87171]'} ${privacyClass}`}>T: {totalProfitPercent.toFixed(2)}%</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-end mt-2 relative z-20">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTransactions}
            onMouseDown={preventBubble}
            className="flex items-center gap-2 text-blue-600 dark:text-[#60a5fa] font-bold text-sm sm:text-base uppercase tracking-wider hover:text-blue-800 dark:hover:text-white transition-colors group/btn relative z-30 py-2 sm:py-3 pr-2"
          >
            <AlignJustify size={20} className="group-hover/btn:scale-110 transition-transform" />
            <span className="hidden xs:inline">TRANSACTIONS</span>
            <span className="xs:hidden">TXS</span>
          </button>

          {/* TRASH BUTTON */}
          <button
            type="button"
            onClick={handleDeleteClick}
            onMouseDown={preventBubble}
            onMouseUp={preventBubble}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-500 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all active:scale-95 ml-2 relative z-50 cursor-pointer"
            title="Remove Asset"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="text-right">
          {/* Current Value in Display Currency */}
          <div className="flex flex-col items-end">
            <div className="text-gray-400 dark:text-zinc-500 text-xs font-bold uppercase mb-1">Value</div>
            <div className={`text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tighter transition-all ${privacyClass}`}>
              {fmtPlain(currentValueDisplay, displaySymbol)}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default StockCard;