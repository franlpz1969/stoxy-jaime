import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Treemap } from 'recharts';
import { LayoutGrid, PieChart as PieIcon, Grid3X3, Info, Gauge, ChevronDown, Check, TrendingUp, TrendingDown } from 'lucide-react';
import { PortfolioPosition } from '../types';

interface ChartsViewProps {
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

type AllocationMetric = 
  | 'value' 
  | 'shares' 
  | 'dayGain' 
  | 'dayLoss' 
  | 'totalGain' 
  | 'totalLoss' 
  | 'realizedGain' 
  | 'realizedLoss';

const METRIC_LABELS: Record<AllocationMetric, string> = {
  value: 'Market Value',
  shares: 'Shares Owned',
  dayGain: "Day's Gain (Profit)",
  dayLoss: "Day's Loss",
  totalGain: 'Total Unrealized Gain',
  totalLoss: 'Total Unrealized Loss',
  realizedGain: 'Realized Gain (Sold)',
  realizedLoss: 'Realized Loss (Sold)'
};

// --- Math Helpers for Correlation ---
const generateMockHistory = (symbol: string, length: number = 30): number[] => {
  let seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
  let price = 100;
  const history = [];
  const trend = (symbol.length % 2 === 0) ? 1.002 : 0.998; 
  for (let i = 0; i < length; i++) {
    const volatility = (random() - 0.5) * 0.05; 
    price = price * (trend + volatility);
    history.push(price);
  }
  return history;
};

const calculatePearsonCorrelation = (x: number[], y: number[]) => {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  if (denominator === 0) return 0;
  return numerator / denominator;
};

const ChartsView: React.FC<ChartsViewProps> = ({ portfolio }) => {
  const [chartType, setChartType] = useState<'heatmap' | 'allocation' | 'correlation' | 'sentiment'>('heatmap');
  const [allocationMetric, setAllocationMetric] = useState<AllocationMetric>('value');
  const [isMetricMenuOpen, setIsMetricMenuOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{r: string, c: string, val: number} | null>(null);

  // --- Heatmap Data Logic ---
  const heatmapData = useMemo(() => {
    return portfolio.map((position) => {
      let shares = 0;
      position.transactions.forEach(tx => {
        if (tx.type === 'BUY') shares += tx.shares;
        else shares -= tx.shares;
      });
      const currentPrice = position.stock.currentPrice ?? 0;
      const value = Math.max(0, shares * currentPrice);
      return {
        name: position.stock.symbol,
        value: value,
        dayChange: position.stock.dayChangePercent ?? 0,
        price: currentPrice,
        shares: shares,
        currency: position.userCurrency || position.stock.currency
      };
    })
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
  }, [portfolio]);

  const getHeatmapColor = (percent: number) => {
    if (percent === 0) return '#3f3f46';
    if (percent > 0) {
      if (percent < 1.5) return '#064e3b';
      if (percent < 3) return '#10b981';
      return '#34d399';
    } else {
      if (percent > -1.5) return '#7f1d1d';
      if (percent > -3) return '#ef4444';
      return '#f87171';
    }
  };

  const CustomHeatmapContent = (props: any) => {
    const { x, y, width, height, name, dayChange } = props;
    const safeDayChange = typeof dayChange === 'number' ? dayChange : 0;
    const color = getHeatmapColor(safeDayChange);
    const showText = width > 40 && height > 35;
    const fontSizeSymbol = Math.min(width / 4, height / 3, 20);
    const fontSizePercent = Math.min(width / 6, height / 5, 12);
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{ fill: color, stroke: '#000000', strokeWidth: 2, vectorEffect: 'non-scaling-stroke' }}
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

  const HeatmapTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const safeDayChange = typeof data.dayChange === 'number' ? data.dayChange : 0;
      const safePrice = typeof data.price === 'number' ? data.price : 0;
      return (
        <div className="bg-zinc-950 border border-zinc-700 p-4 rounded-xl shadow-2xl min-w-[160px] z-50">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-lg text-white">{data.name}</span>
            <span className={`font-bold px-2 py-0.5 rounded text-xs ${safeDayChange >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
               {safeDayChange > 0 ? '+' : ''}{safeDayChange.toFixed(2)}%
            </span>
          </div>
          <div className="space-y-1 text-sm text-zinc-400">
            <div className="flex justify-between"><span>Price:</span><span className="text-white font-mono">{data.currency === 'USD' ? '$' : data.currency}{safePrice.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Shares:</span><span className="text-white font-mono">{data.shares.toLocaleString()}</span></div>
            <div className="flex justify-between pt-2 border-t border-zinc-800 mt-1"><span>Value:</span><span className="text-white font-mono font-bold">{data.currency === 'USD' ? '$' : data.currency}{data.value.toLocaleString(undefined, {maximumFractionDigits: 0})}</span></div>
          </div>
        </div>
      );
    }
    return null;
  };

  // --- Allocation Data Logic ---
  const { allocationData, totalAllocValue } = useMemo(() => {
    let total = 0;
    const chartData = portfolio.map((position) => {
      let shares = 0;
      let cost = 0;
      let realizedG = 0;

      // Calculate shares and realized PnL from transactions
      position.transactions.forEach(tx => {
        if (tx.type === 'BUY') {
          shares += tx.shares;
          cost += tx.shares * tx.price;
        } else {
          // Sell
          if (shares > 0) {
             const avgCost = cost / shares;
             const pnl = (tx.price - avgCost) * tx.shares;
             realizedG += pnl;
             cost -= tx.shares * avgCost;
             shares -= tx.shares;
          }
        }
      });

      const currentPrice = position.stock.currentPrice ?? 0;
      const marketValue = shares * currentPrice;
      const totalGainVal = marketValue - cost;
      
      // Daily calc
      const dayPct = position.stock.dayChangePercent ?? 0;
      const prevPrice = currentPrice / (1 + (dayPct / 100));
      const dayGainVal = (currentPrice - prevPrice) * shares;

      let valueForChart = 0;

      switch (allocationMetric) {
        case 'value': 
            valueForChart = marketValue; 
            break;
        case 'shares': 
            valueForChart = shares; 
            break;
        case 'dayGain': 
            valueForChart = dayGainVal > 0 ? dayGainVal : 0; 
            break;
        case 'dayLoss': 
            valueForChart = dayGainVal < 0 ? Math.abs(dayGainVal) : 0; 
            break;
        case 'totalGain': 
            valueForChart = totalGainVal > 0 ? totalGainVal : 0; 
            break;
        case 'totalLoss': 
            valueForChart = totalGainVal < 0 ? Math.abs(totalGainVal) : 0; 
            break;
        case 'realizedGain': 
            valueForChart = realizedG > 0 ? realizedG : 0; 
            break;
        case 'realizedLoss': 
            valueForChart = realizedG < 0 ? Math.abs(realizedG) : 0; 
            break;
      }

      // Round to 2 decimals
      valueForChart = Math.round(valueForChart * 100) / 100;

      if (valueForChart > 0) {
        total += valueForChart;
      }

      return {
        name: position.stock.symbol,
        value: valueForChart,
        currency: position.userCurrency || position.stock.currency,
        shares: shares
      };
    })
    // Filter slightly more aggressively only for purely 0 values to avoid hiding small fractional shares
    .filter(item => item.value > 0.0001) 
    .sort((a, b) => b.value - a.value);

    return { allocationData: chartData, totalAllocValue: total };
  }, [portfolio, allocationMetric]);

  const AllocationTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percent = totalAllocValue > 0 ? (item.value / totalAllocValue) * 100 : 0;
      let formattedValue = '';
      if (allocationMetric === 'shares') {
         formattedValue = item.value.toLocaleString();
      } else {
         const sym = item.currency === 'USD' ? '$' : item.currency;
         formattedValue = `${sym}${item.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      }

      return (
        <div className="bg-zinc-950 border border-zinc-700 p-3 rounded-xl shadow-xl z-50">
          <div className="font-bold text-white mb-1">{item.name}</div>
          <div className="text-zinc-400 text-xs mb-2">
            {METRIC_LABELS[allocationMetric as AllocationMetric]}: <span className="text-white font-mono">{formattedValue}</span>
          </div>
          <div className="flex justify-between gap-4 text-sm mt-1 pt-1 border-t border-zinc-800">
            <span className="text-zinc-400">Of Displayed Total:</span>
            <span className="font-mono text-blue-400 font-bold">{percent.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // --- Correlation Data Logic ---
  const correlationData = useMemo(() => {
    const assets = portfolio.map(p => p.stock.symbol);
    const uniqueAssets = Array.from(new Set(assets)) as string[];
    const histories: Record<string, number[]> = {};
    uniqueAssets.forEach(sym => { histories[sym] = generateMockHistory(sym); });
    const matrix = uniqueAssets.map(rowSym => {
      return uniqueAssets.map(colSym => {
        if (rowSym === colSym) return 1;
        return calculatePearsonCorrelation(histories[rowSym], histories[colSym]);
      });
    });
    return { symbols: uniqueAssets, matrix };
  }, [portfolio]);

  const getCorrelationColor = (value: number) => {
    if (value >= 0.8) return 'bg-blue-600 text-white';
    if (value >= 0.5) return 'bg-blue-500/60 text-white';
    if (value >= 0.2) return 'bg-blue-500/30 text-blue-200';
    if (value >= -0.2) return 'bg-zinc-800/50 text-zinc-500';
    if (value >= -0.5) return 'bg-red-500/30 text-red-200';
    return 'bg-red-600 text-white';
  };

  // --- Fear & Greed Data Logic (Weighted by Portfolio) ---
  const { sentimentScore, sentimentDrivers } = useMemo(() => {
    if (!portfolio.length) return { sentimentScore: 50, sentimentDrivers: [] };
    
    let totalVal = 0;
    let totalDayChangeVal = 0;
    const drivers: { symbol: string, impact: number, change: number }[] = [];

    portfolio.forEach(pos => {
      let shares = 0;
      pos.transactions.forEach(tx => {
        if (tx.type === 'BUY') shares += tx.shares;
        else shares -= tx.shares;
      });
      const price = pos.stock.currentPrice || 0;
      const value = shares * price;
      const dayPct = pos.stock.dayChangePercent || 0;
      // Reverse calc previous price
      const prevPrice = price / (1 + (dayPct / 100));
      const changeVal = (price - prevPrice) * shares;
      
      totalVal += value;
      totalDayChangeVal += changeVal;

      if (value > 0) {
          drivers.push({ 
              symbol: pos.stock.symbol, 
              impact: changeVal,
              change: dayPct
          });
      }
    });

    if (totalVal === 0) return { sentimentScore: 50, sentimentDrivers: [] };
    const prevTotalVal = totalVal - totalDayChangeVal;
    
    // Calculate aggregate percentage change of the entire portfolio
    const aggregatePctChange = prevTotalVal !== 0 ? ((totalVal - prevTotalVal) / prevTotalVal) * 100 : 0;
    
    // Use hyperbolic tangent for a smooth 0-100 curve that handles volatility better
    // A daily change of +2% is very good (Greed), -2% is bad (Fear).
    // tanh(1) ~= 0.76. 
    let score = 50 + (50 * Math.tanh(aggregatePctChange / 1.5)); 
    score = Math.max(0, Math.min(100, score));

    // Sort drivers by absolute impact on the portfolio PnL
    drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    
    return { sentimentScore: score, sentimentDrivers: drivers.slice(0, 3) };
  }, [portfolio]);

  const getSentimentLabel = (score: number) => {
    if (score < 25) return { text: "Extreme Fear", color: "text-red-500", desc: "Portfolio is seeing heavy sell-off" };
    if (score < 45) return { text: "Fear", color: "text-orange-500", desc: "Portfolio performance is dragging" };
    if (score < 55) return { text: "Neutral", color: "text-zinc-400", desc: "Portfolio is stable today" };
    if (score < 75) return { text: "Greed", color: "text-[#84cc16]", desc: "Portfolio is outperforming" };
    return { text: "Extreme Greed", color: "text-green-500", desc: "Portfolio is rallying strongly" };
  };

  return (
    <div className="p-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 h-screen flex flex-col">
      <div className="flex justify-between items-center py-4 mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Charts</h1>
        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
           <button onClick={() => setChartType('heatmap')} className={`p-2 rounded-lg transition-all ${chartType === 'heatmap' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} title="Heatmap"><LayoutGrid size={20} /></button>
           <button onClick={() => setChartType('allocation')} className={`p-2 rounded-lg transition-all ${chartType === 'allocation' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} title="Allocation"><PieIcon size={20} /></button>
           <button onClick={() => setChartType('correlation')} className={`p-2 rounded-lg transition-all ${chartType === 'correlation' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} title="Correlation Matrix"><Grid3X3 size={20} /></button>
           <button onClick={() => setChartType('sentiment')} className={`p-2 rounded-lg transition-all ${chartType === 'sentiment' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`} title="Fear & Greed Index"><Gauge size={20} /></button>
        </div>
      </div>

      {/* Main Content Container. NOTE: overflow-visible allowed when using dropdown to prevent clipping */}
      <div className={`flex-1 bg-[#1C1C1E] border border-zinc-800 rounded-3xl p-1 relative shadow-lg flex flex-col ${chartType === 'allocation' ? 'overflow-visible' : 'overflow-hidden'}`}>
        
        {/* Heatmap View */}
        {chartType === 'heatmap' && (
           <>
              <div className="absolute top-4 left-6 z-10 pointer-events-none">
                 <h3 className="text-zinc-300 font-bold text-sm uppercase tracking-wider">Market Map</h3>
                 <p className="text-zinc-600 text-[10px] font-bold mt-0.5">Size = Value • Color = Daily %</p>
              </div>
              {heatmapData.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                    <LayoutGrid size={48} className="mb-4 opacity-20" />
                    <p>Not enough data to display heatmap.</p>
                 </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                    data={heatmapData}
                    dataKey="value"
                    aspectRatio={4 / 3}
                    stroke="none"
                    content={<CustomHeatmapContent />}
                    animationDuration={800}
                    isAnimationActive={true}
                    >
                    <Tooltip content={<HeatmapTooltip />} cursor={false} />
                    </Treemap>
                </ResponsiveContainer>
              )}
           </>
        )}

        {/* Allocation View */}
        {chartType === 'allocation' && (
           <div className="h-full flex flex-col relative">
              {/* Header Container with Z-index fix for Dropdown */}
              <div className={`p-4 md:p-6 text-center relative ${isMetricMenuOpen ? 'z-50' : 'z-20'}`}>
                 <h3 className="text-zinc-300 font-bold text-sm uppercase tracking-wider">Asset Allocation</h3>
                 
                 {/* Metric Selector Dropdown */}
                 <div className="relative inline-block mt-2">
                    <button 
                      onClick={() => setIsMetricMenuOpen(!isMetricMenuOpen)}
                      className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-white font-bold text-sm hover:bg-zinc-800 transition-colors"
                    >
                      {METRIC_LABELS[allocationMetric as AllocationMetric]}
                      <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isMetricMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isMetricMenuOpen && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-1 z-[60]">
                        {(Object.entries(METRIC_LABELS) as [AllocationMetric, string][]).map(([metric, label]) => (
                          <button
                            key={metric}
                            onClick={() => {
                              setAllocationMetric(metric as AllocationMetric);
                              setIsMetricMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-between"
                          >
                            {label}
                            {allocationMetric === metric && <Check size={14} className="text-blue-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                 </div>

                 {/* Display Total for metric */}
                 <div className="text-xl font-bold text-zinc-500 mt-2 animate-in fade-in duration-300">
                    {allocationMetric === 'shares' ? '' : '$'}
                    {totalAllocValue.toLocaleString(undefined, {maximumFractionDigits: 2})}
                 </div>
              </div>
              
              <div className="flex-1 relative -mt-4 z-10">
                {allocationData.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-zinc-600 animate-in fade-in zoom-in duration-300">
                      <PieIcon size={48} className="mb-4 opacity-20" />
                      <p>No data for {METRIC_LABELS[allocationMetric as AllocationMetric]}</p>
                      {(allocationMetric === 'totalLoss' || allocationMetric === 'dayLoss' || allocationMetric === 'realizedLoss') && (
                          <p className="text-xs text-green-500 mt-1">That's a good thing!</p>
                      )}
                   </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                        >
                        {allocationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Pie>
                        <Tooltip content={<AllocationTooltip />} />
                        <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold' }}
                        formatter={(value, entry: any) => (
                            <span className="text-zinc-400 ml-1">{value}</span>
                        )}
                        />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              
              {/* Overlay for closing menu - Changed to absolute to respect container context but be below header z-50 */}
              {isMetricMenuOpen && (
                  <div className="absolute inset-0 z-40 bg-transparent" onClick={() => setIsMetricMenuOpen(false)} />
              )}
           </div>
        )}

        {/* Correlation View */}
        {chartType === 'correlation' && (
            <div className="h-full flex flex-col overflow-hidden">
                <div className="p-6 pb-2 flex justify-between items-start">
                    <div>
                        <h3 className="text-zinc-300 font-bold text-sm uppercase tracking-wider">Asset Correlation</h3>
                        <p className="text-zinc-500 text-[10px] mt-1 flex items-center gap-1">
                            <Info size={10} /> Based on 30-day simulated trend analysis
                        </p>
                    </div>
                </div>
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                    {correlationData.symbols.length < 2 ? (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                            <Grid3X3 size={48} className="mb-4 opacity-20" />
                            <p>Need at least 2 assets.</p>
                        </div>
                    ) : (
                        <div className="inline-block min-w-full">
                            <div className="flex">
                                <div className="w-16 shrink-0"></div> 
                                {correlationData.symbols.map(sym => (
                                    <div key={sym} className="w-12 h-10 flex items-end justify-center pb-2 text-[10px] font-bold text-zinc-400 rotate-0">
                                        {sym.substring(0,3)}
                                    </div>
                                ))}
                            </div>
                            
                            {correlationData.symbols.map((rowSym, rowIndex) => (
                                <div key={rowSym} className="flex mb-1">
                                    <div className="w-16 h-10 shrink-0 flex items-center justify-end pr-3 text-[10px] font-bold text-zinc-400">
                                        {rowSym}
                                    </div>
                                    {correlationData.matrix[rowIndex].map((val, colIndex) => (
                                        <div 
                                            key={`${rowSym}-${colIndex}`} 
                                            className={`w-12 h-10 mr-1 rounded-md flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110 cursor-default relative group ${getCorrelationColor(val)}`}
                                            onMouseEnter={() => setHoveredCell({r: rowSym, c: correlationData.symbols[colIndex], val})}
                                            onMouseLeave={() => setHoveredCell(null)}
                                        >
                                            {val.toFixed(2)}
                                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-950 text-white text-[10px] px-2 py-1 rounded border border-zinc-700 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-20 shadow-xl">
                                                {rowSym} vs {correlationData.symbols[colIndex]}: {val.toFixed(3)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-center items-center gap-4 text-[10px] text-zinc-500 font-bold">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-600 rounded-sm"></div> Neg</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-zinc-800 rounded-sm"></div> 0</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600 rounded-sm"></div> Pos</div>
                </div>
            </div>
        )}

        {/* Sentiment View (Fear & Greed) */}
        {chartType === 'sentiment' && (
            <div className="h-full flex flex-col p-6 text-center overflow-y-auto custom-scrollbar">
                 <div className="text-left w-full mb-4">
                    <h3 className="text-zinc-300 font-bold text-sm uppercase tracking-wider">Portfolio Sentiment</h3>
                    <p className="text-zinc-600 text-[10px] font-bold mt-0.5">Weighted analysis of your holdings</p>
                 </div>
                 
                 <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                    <div className="relative w-64 h-32 overflow-hidden mb-4">
                        <div 
                        className="w-64 h-64 rounded-full absolute top-0 left-0"
                        style={{background: `conic-gradient(from 270deg at 50% 50%, #ef4444 0deg 36deg, #f97316 36deg 72deg, #e4e4e7 72deg 108deg, #84cc16 108deg 144deg, #22c55e 144deg 180deg, transparent 180deg)`}}
                        />
                        <div className="w-52 h-52 bg-[#1C1C1E] rounded-full absolute top-6 left-6 z-10" />
                        <div 
                            className="absolute bottom-0 left-1/2 w-1.5 h-32 bg-zinc-200 origin-bottom z-20 transition-transform duration-1000 ease-out border border-black"
                            style={{ transform: `translateX(-50%) rotate(${(sentimentScore / 100) * 180 - 90}deg)` }}
                        >
                            <div className="w-4 h-4 bg-zinc-200 rounded-full absolute bottom-0 left-1/2 -translate-x-1/2 shadow-lg" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center z-20 mt-2">
                        <div className={`text-3xl font-black uppercase tracking-tight ${getSentimentLabel(sentimentScore).color}`}>
                            {getSentimentLabel(sentimentScore).text}
                        </div>
                        <div className="text-white text-lg font-bold mt-1">
                            {Math.round(sentimentScore)} <span className="text-zinc-600 text-sm">/ 100</span>
                        </div>
                        <p className="text-zinc-500 text-sm mt-2 max-w-xs leading-relaxed">
                            {getSentimentLabel(sentimentScore).desc}
                        </p>
                    </div>
                 </div>

                 {/* Sentiment Drivers Section */}
                 {sentimentDrivers.length > 0 && (
                    <div className="w-full mt-6 bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider text-left mb-3">Sentiment Drivers</h4>
                        <div className="space-y-3">
                            {sentimentDrivers.map((driver) => (
                                <div key={driver.symbol} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${driver.change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        <span className="font-bold text-white">{driver.symbol}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className={`flex items-center text-xs font-medium ${driver.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {driver.change >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
                                            {driver.change > 0 ? '+' : ''}{driver.change.toFixed(2)}%
                                        </div>
                                        <span className="text-zinc-600 text-xs w-16 text-right font-mono">
                                            {driver.impact > 0 ? '+' : '-'}${Math.abs(driver.impact).toLocaleString(undefined, {maximumFractionDigits: 0})}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 )}
            </div>
        )}

      </div>

      {/* Legend for Heatmap only */}
      {chartType === 'heatmap' && heatmapData.length > 0 && (
         <div className="mt-4 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-2 flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-500">
            <span>-3%</span>
            <div className="flex gap-0.5">
                <div className="w-4 h-3 bg-[#f87171] rounded-[1px]"></div>
                <div className="w-4 h-3 bg-[#ef4444] rounded-[1px]"></div>
                <div className="w-4 h-3 bg-[#7f1d1d] rounded-[1px]"></div>
                <div className="w-4 h-3 bg-[#3f3f46] rounded-[1px]"></div>
                <div className="w-4 h-3 bg-[#064e3b] rounded-[1px]"></div>
                <div className="w-4 h-3 bg-[#10b981] rounded-[1px]"></div>
                <div className="w-4 h-3 bg-[#34d399] rounded-[1px]"></div>
            </div>
            <span>+3%</span>
         </div>
      )}
    </div>
  );
};

export default ChartsView;