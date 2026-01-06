import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, PlusCircle, ChevronDown, CheckCircle } from 'lucide-react';
import { StockSearchInputs } from '../types';
import { searchSymbols, fetchStockPrice, getCompanyLogo } from '../services/geminiService';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (inputs: StockSearchInputs) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AddStockModal: React.FC<AddStockModalProps> = ({ isOpen, onClose, onSubmit, loading, error }) => {
  const [inputs, setInputs] = useState<StockSearchInputs>({
    symbol: '',
    shares: '',
    buyPrice: '',
    currency: 'USD'
  });

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Use a timeout ref for debouncing
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: value }));

    // Trigger Search logic if symbol changes
    if (name === 'symbol') {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

      if (value.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearching(true);
      setShowDropdown(true);

      debounceTimeout.current = setTimeout(async () => {
        const results = await searchSymbols(value);
        // Limit to 10 suggestions for cleaner UI
        const filtered = results.slice(0, 10);
        setSearchResults(filtered);
        setIsSearching(false);
      }, 400); // 400ms debounce
    }
  };

  const selectSymbol = async (item: any) => {
    setInputs(prev => ({ ...prev, symbol: item.symbol }));
    setShowDropdown(false);
    setSearchResults([]);

    // Auto-fetch price for convenience
    const priceData = await fetchStockPrice(item.symbol);
    if (priceData) {
      setInputs(prev => ({ ...prev, buyPrice: priceData.price.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(inputs);
  };

  const getTypeColor = (type: string) => {
    if (!type) return 'bg-zinc-800 text-zinc-400';
    const t = type.toUpperCase();
    if (t === 'EQUITY') return 'bg-blue-500/20 text-blue-400';
    if (t === 'ETF') return 'bg-purple-500/20 text-purple-400';
    if (t === 'MUTUALFUND') return 'bg-emerald-500/20 text-emerald-400';
    if (t === 'CRYPTOCURRENCY') return 'bg-orange-500/20 text-orange-400';
    if (t === 'INDEX') return 'bg-zinc-700 text-zinc-300';
    return 'bg-zinc-800 text-zinc-400';
  };

  const formatType = (type: string) => {
    if (!type) return 'ASSET';
    const t = type.toUpperCase();
    if (t === 'EQUITY') return 'STOCK';
    if (t === 'MUTUALFUND') return 'FUND';
    return t;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1C1C1E] border-t md:border border-zinc-800 w-full max-w-md md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-auto">

        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-xl font-bold text-white">Add Asset</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div className="relative">
              <label className="block text-zinc-500 text-xs font-bold uppercase mb-2 ml-1">Symbol / ISIN</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input
                  type="text"
                  name="symbol"
                  value={inputs.symbol}
                  onChange={handleInputChange}
                  placeholder="Search Ticker or ISIN..."
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white text-lg font-medium focus:outline-none focus:border-blue-500 transition-all placeholder-zinc-700"
                  autoFocus
                  autoComplete="off"
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Loader2 className="animate-spin text-blue-500" size={18} />
                  </div>
                )}
              </div>

              {/* Dropdown Results (Yahoo Style) */}
              {showDropdown && (inputs.symbol.length >= 2) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#151517] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                  {searchResults.length === 0 && !isSearching ? (
                    <div className="p-4 text-center text-zinc-500 text-sm">
                      <p>No results found.</p>
                      <p className="text-xs text-zinc-600 mt-1">Try searching by ISIN or full name.</p>
                    </div>
                  ) : (
                    searchResults.map((item, idx) => (
                      <div
                        key={`${item.symbol}-${idx}`}
                        onClick={() => selectSymbol(item)}
                        className="flex items-center justify-between p-3 hover:bg-zinc-800/50 cursor-pointer border-b border-zinc-900 last:border-0 transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                          <div className="w-8 h-8 rounded-lg bg-white border border-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                            <img
                              src={getCompanyLogo(item.symbol)}
                              alt={item.symbol}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const domain = item.symbol.split('.')[0].toLowerCase() + '.com';
                                e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white group-hover:text-blue-400 transition-colors">{item.symbol}</span>
                              {item.exchange && (
                                <span className="text-[9px] text-zinc-500 font-bold bg-zinc-900 px-1 rounded">{item.exchange}</span>
                              )}
                            </div>
                            <div className="text-sm text-zinc-400 truncate">{item.description}</div>
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${getTypeColor(item.type)}`}>
                          {formatType(item.type)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-500 text-xs font-bold uppercase mb-2 ml-1">Quantity</label>
                <input
                  type="number"
                  name="shares"
                  value={inputs.shares}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="any"
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-4 text-white text-lg font-medium focus:outline-none focus:border-blue-500 transition-all placeholder-zinc-700"
                />
              </div>

              <div>
                <label className="block text-zinc-500 text-xs font-bold uppercase mb-2 ml-1">Avg Price</label>
                <input
                  type="number"
                  name="buyPrice"
                  value={inputs.buyPrice}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="any"
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-4 text-white text-lg font-medium focus:outline-none focus:border-blue-500 transition-all placeholder-zinc-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 text-xs font-bold uppercase mb-2 ml-1">Currency</label>
              <div className="relative">
                <select
                  name="currency"
                  value={inputs.currency}
                  onChange={handleInputChange}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-4 pr-10 text-white text-lg font-medium focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
                >
                  {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={20} />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-200 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-900/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <PlusCircle size={20} />
                  <span>Add to Portfolio</span>
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default AddStockModal;
