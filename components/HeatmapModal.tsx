import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';
import { PortfolioPosition } from '../types';

interface HeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: PortfolioPosition[];
}

const HeatmapModal: React.FC<HeatmapModalProps> = ({ isOpen, onClose, portfolio }) => {
  if (!isOpen) return null;

  // Prepare data for the Tree Map
  // We provide a flat array of objects. Recharts will tile them.
  const data = useMemo(() => {
    return portfolio.map((position) => {
      // Calculate total shares
      let shares = 0;
      position.transactions.forEach(tx => {
        if (tx.type === 'BUY') shares += tx.shares;
        else shares -= tx.shares;
      });

      // Calculate weight (Current Value)
      const currentPrice = position.stock.currentPrice ?? 0;
      const value = Math.max(0, shares * currentPrice);

      return {
        name: position.stock.symbol,
        value: value, // Value determines the size of the tile
        dayChange: position.stock.dayChangePercent ?? 0,
        price: currentPrice,
        shares: shares,
        currency: position.userCurrency || position.stock.currency
      };
    })
    .filter(item => item.value > 0) // Remove items with 0 value
    .sort((a, b) => b.value - a.value); // Sort so biggest are usually top-left
  }, [portfolio]);

  const getHeatmapColor = (percent: number) => {
    if (percent === 0) return '#3f3f46'; // zinc-700 (Neutral)
    
    if (percent > 0) {
      if (percent < 1.5) return '#064e3b'; // emerald-900 (Dark Green)
      if (percent < 3) return '#10b981';   // emerald-500 (Medium Green)
      return '#34d399';                    // emerald-400 (Bright Green)
    } else {
      if (percent > -1.5) return '#7f1d1d'; // red-900 (Dark Red)
      if (percent > -3) return '#ef4444';   // red-500 (Medium Red)
      return '#f87171';                     // red-400 (Bright Red)
    }
  };

  const CustomContent = (props: any) => {
    const { x, y, width, height, name, dayChange } = props;
    
    // We are rendering individual items directly, no depth check needed for flat list
    
    const safeDayChange = typeof dayChange === 'number' ? dayChange : 0;
    const color = getHeatmapColor(safeDayChange);
    
    // Text sizing logic
    const fontSizeSymbol = Math.min(width / 4, height / 3, 24);
    const fontSizePercent = Math.min(width / 6, height / 5, 14);
    
    // Only show text if there is enough space
    const showText = width > 35 && height > 35;

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: color,
            stroke: '#000000', 
            strokeWidth: 1,
            vectorEffect: 'non-scaling-stroke'
          }}
        />
        {showText && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - (fontSizePercent / 1.5)}
              textAnchor="middle"
              fill="#fff"
              fontSize={fontSizeSymbol}
              fontWeight="bold"
              dominantBaseline="middle"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)', pointerEvents: 'none' }}
            >
              {name}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + (fontSizeSymbol / 1.5)}
              textAnchor="middle"
              fill="#fff"
              fontSize={fontSizePercent}
              fontWeight="500"
              dominantBaseline="middle"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)', pointerEvents: 'none' }}
            >
              {safeDayChange > 0 ? '+' : ''}{safeDayChange.toFixed(2)}%
            </text>
          </>
        )}
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const safeDayChange = typeof data.dayChange === 'number' ? data.dayChange : 0;
      const safePrice = typeof data.price === 'number' ? data.price : 0;
      
      return (
        <div className="bg-zinc-950 border border-zinc-700 p-4 rounded-lg shadow-2xl min-w-[150px] z-50">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-lg text-white">{data.name}</span>
            <span className={`font-bold px-2 py-0.5 rounded text-sm ${safeDayChange >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
               {safeDayChange > 0 ? '+' : ''}{safeDayChange.toFixed(2)}%
            </span>
          </div>
          <div className="space-y-1 text-sm text-zinc-400">
            <div className="flex justify-between">
                <span>Price:</span>
                <span className="text-white font-mono">{data.currency === 'USD' ? '$' : data.currency}{safePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
                <span>Shares:</span>
                <span className="text-white font-mono">{data.shares.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-zinc-800 mt-1">
                <span>Value:</span>
                <span className="text-white font-mono font-bold">{data.currency === 'USD' ? '$' : data.currency}{data.value.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-black border border-zinc-800 w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div>
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Portfolio Map
             </h2>
             <p className="text-zinc-500 text-xs uppercase tracking-wider font-semibold">Size = Market Value • Color = Daily Performance</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chart Area */}
        <div className="flex-1 bg-black p-1 relative min-h-[400px]">
          {data.length === 0 ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                <p>No holdings with value to display.</p>
                <p className="text-sm mt-1">Add stocks or check share counts.</p>
             </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={data}
                dataKey="value"
                aspectRatio={4 / 3}
                stroke="none"
                content={<CustomContent />}
                animationDuration={800}
                isAnimationActive={true}
              >
                <Tooltip content={<CustomTooltip />} cursor={false} />
              </Treemap>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend */}
        <div className="bg-zinc-900/50 border-t border-zinc-800 px-6 py-3 flex flex-wrap gap-4 items-center justify-center text-xs font-medium text-zinc-400">
            <span>-3%</span>
            <div className="flex gap-0.5">
                <div className="w-6 h-4 bg-[#f87171] rounded-sm"></div>
                <div className="w-6 h-4 bg-[#ef4444] rounded-sm"></div>
                <div className="w-6 h-4 bg-[#7f1d1d] rounded-sm"></div>
                <div className="w-6 h-4 bg-[#3f3f46] rounded-sm"></div>
                <div className="w-6 h-4 bg-[#064e3b] rounded-sm"></div>
                <div className="w-6 h-4 bg-[#10b981] rounded-sm"></div>
                <div className="w-6 h-4 bg-[#34d399] rounded-sm"></div>
            </div>
            <span>+3%</span>
        </div>

      </div>
    </div>
  );
};

export default HeatmapModal;