import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { PortfolioPosition } from '../types';

interface PieChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: PortfolioPosition[];
}

const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#6366f1', // indigo-500
  '#d946ef', // fuchsia-500
];

const PieChartModal: React.FC<PieChartModalProps> = ({ isOpen, onClose, portfolio }) => {
  if (!isOpen) return null;

  const { data, totalValue } = useMemo(() => {
    let total = 0;
    const chartData = portfolio.map((position) => {
      let shares = 0;
      position.transactions.forEach(tx => {
        if (tx.type === 'BUY') shares += tx.shares;
        else shares -= tx.shares;
      });

      const currentPrice = position.stock.currentPrice ?? 0;
      const value = Math.max(0, shares * currentPrice);
      total += value;

      return {
        name: position.stock.symbol,
        value: value,
        currency: position.userCurrency || position.stock.currency,
        shares: shares
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);

    return { data: chartData, totalValue: total };
  }, [portfolio]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percent = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
      
      return (
        <div className="bg-zinc-950 border border-zinc-700 p-3 rounded-lg shadow-xl z-50">
          <div className="font-bold text-white mb-1">{item.name}</div>
          <div className="text-zinc-400 text-xs mb-2">{item.shares.toLocaleString()} shares</div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-zinc-400">Value:</span>
            <span className="font-mono text-white font-semibold">
               {item.currency === 'USD' ? '$' : item.currency}
               {item.value.toLocaleString(undefined, {maximumFractionDigits: 0})}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-zinc-400">Allocation:</span>
            <span className="font-mono text-blue-400 font-bold">{percent.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-black border border-zinc-800 w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div>
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Portfolio Allocation
             </h2>
             <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">
                Total Value: {data.length > 0 && (data[0].currency === 'USD' ? '$' : data[0].currency)}{totalValue.toLocaleString(undefined, {maximumFractionDigits: 2})}
             </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chart Area */}
        <div className="flex-1 bg-black p-4 relative min-h-[400px] flex items-center justify-center">
          {data.length === 0 ? (
             <div className="text-center text-zinc-600">
                <p>No holdings with value to display.</p>
             </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={160}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{ color: '#fff' }}
                  formatter={(value, entry: any) => (
                    <span className="text-zinc-300 font-medium ml-2">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  );
};

export default PieChartModal;