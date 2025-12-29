import React, { useState } from 'react';
import { X, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Transaction, TransactionType } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onAddTransaction: (type: TransactionType, shares: number, price: number) => void;
  onDeleteTransaction: (id: string) => void;
  currencySymbol: string;
  currentPrice: number;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  currencySymbol,
  currentPrice
}) => {
  const [type, setType] = useState<TransactionType>('BUY');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState(currentPrice.toString());

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shares || !price) return;
    
    onAddTransaction(type, parseFloat(shares), parseFloat(price));
    setShares('');
    // Keep price as current price or last entered for convenience
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1C1C1E] border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Transactions</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {transactions.length === 0 ? (
            <div className="text-center text-zinc-500 py-10">No transactions yet.</div>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'BUY' ? 'bg-blue-500/20 text-blue-500' : 'bg-orange-500/20 text-orange-500'}`}>
                    {tx.type === 'BUY' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {tx.type === 'BUY' ? 'Buy' : 'Sell'} {tx.shares} shares
                    </div>
                    <div className="text-zinc-500 text-xs">
                      {tx.date.toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-white font-medium">@{currencySymbol}{tx.price.toLocaleString()}</div>
                    <div className="text-zinc-500 text-xs">Total: {currencySymbol}{(tx.shares * tx.price).toLocaleString()}</div>
                  </div>
                  {transactions.length > 1 && (
                    <button 
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Form */}
        <div className="p-6 bg-zinc-900 border-t border-zinc-800">
          <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Add Transaction</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="flex bg-black rounded-xl p-1 border border-zinc-800">
              <button
                type="button"
                onClick={() => setType('BUY')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'BUY' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setType('SELL')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'SELL' ? 'bg-orange-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                Sell
              </button>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs text-zinc-500 font-bold ml-1 mb-1 block">Shares</label>
                <input
                  type="number"
                  placeholder="0"
                  step="any"
                  value={shares}
                  onChange={(e) => setShares(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-500 font-bold ml-1 mb-1 block">Price ({currencySymbol})</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Add Transaction
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default TransactionModal;
