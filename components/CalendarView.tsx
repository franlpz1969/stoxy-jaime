import React, { useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, TrendingUp, DollarSign, Wallet, Globe } from 'lucide-react';
import { PortfolioPosition } from '../types';

interface CalendarViewProps {
  portfolio: PortfolioPosition[];
}

// 1. General Market Events (Shown to everyone)
const GENERAL_EVENTS = [
  { ticker: 'NVDA', name: 'Nvidia Corp', type: 'Earnings', daysFromNow: 0, time: 'After Close', estimate: '$5.12 EPS' },
  { ticker: 'FOMC', name: 'Fed Minutes', type: 'Economic', daysFromNow: 0, time: '2:00 PM EST', estimate: 'High Impact' },
  { ticker: 'CRM', name: 'Salesforce', type: 'Earnings', daysFromNow: 1, time: 'Before Open', estimate: '$2.30 EPS' },
  { ticker: 'CPI', name: 'Consumer Price Index', type: 'Economic', daysFromNow: 1, time: '8:30 AM EST', estimate: '3.4% YoY' },
  { ticker: 'TSLA', name: 'Tesla Inc', type: 'Earnings', daysFromNow: 4, time: 'After Close', estimate: '$0.75 EPS' },
];

// 2. Dividend Database (Only shown if user holds the stock)
const DIVIDEND_DATABASE: Record<string, { amount: number, daysFromNow: number }> = {
  'AAPL': { amount: 0.24, daysFromNow: 0 }, // Today
  'NVDA': { amount: 0.04, daysFromNow: 5 },
  'KO': { amount: 0.46, daysFromNow: 1 }, // Tomorrow
  'MSFT': { amount: 0.75, daysFromNow: 12 },
  'JPM': { amount: 1.05, daysFromNow: 15 },
  'PEP': { amount: 1.26, daysFromNow: 2 },
};

const CalendarView: React.FC<CalendarViewProps> = ({ portfolio }) => {

  const events = useMemo(() => {
    let allEvents: any[] = [];
    const today = new Date();

    // Helper to get date object
    const getDateFromOffset = (offset: number) => {
        const d = new Date();
        d.setDate(today.getDate() + offset);
        return d;
    };

    // A. Add General Events
    GENERAL_EVENTS.forEach(genEvent => {
        allEvents.push({
            category: 'MARKET', // Market Event
            dateObj: getDateFromOffset(genEvent.daysFromNow),
            ticker: genEvent.ticker,
            name: genEvent.name,
            type: genEvent.type,
            meta: genEvent.estimate,
            time: genEvent.time,
            daysFromNow: genEvent.daysFromNow
        });
    });

    // B. Add Portfolio Dividend Events
    portfolio.forEach(position => {
      const sym = position.stock.symbol.toUpperCase();
      const divInfo = DIVIDEND_DATABASE[sym];

      if (divInfo && divInfo.amount > 0) {
        // Calculate shares
        let shares = 0;
        position.transactions.forEach(tx => {
            if (tx.type === 'BUY') shares += tx.shares;
            else shares -= tx.shares;
        });

        if (shares > 0) {
            const payout = shares * divInfo.amount;
            allEvents.push({
                category: 'INCOME', // Personal Income
                dateObj: getDateFromOffset(divInfo.daysFromNow),
                ticker: sym,
                name: position.stock.companyName,
                type: 'Dividend',
                amountPerShare: divInfo.amount,
                totalPayout: payout,
                currency: position.userCurrency || '$',
                daysFromNow: divInfo.daysFromNow
            });
        }
      }
    });

    // Sort by date (daysFromNow)
    allEvents.sort((a, b) => a.daysFromNow - b.daysFromNow);

    // Group by Date Label
    const groups: Record<string, typeof allEvents> = {};
    allEvents.forEach(evt => {
        let dateLabel = '';
        if (evt.daysFromNow === 0) dateLabel = 'Today';
        else if (evt.daysFromNow === 1) dateLabel = 'Tomorrow';
        else dateLabel = evt.dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

        if (!groups[dateLabel]) groups[dateLabel] = [];
        groups[dateLabel].push(evt);
    });

    return groups;
  }, [portfolio]);

  const groupKeys = Object.keys(events);

  return (
    <div className="p-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center py-4 mb-4">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
            <p className="text-zinc-500 text-xs">Market events & income schedule</p>
        </div>
        <button className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
           <CalendarIcon size={20} />
        </button>
      </div>

      <div className="space-y-6">
        {groupKeys.map((dateLabel, i) => (
            <div key={i}>
                <h3 className="text-zinc-500 font-bold text-xs uppercase mb-3 pl-2 border-l-2 border-blue-500">{dateLabel}</h3>
                <div className="bg-[#151517] border border-zinc-800 rounded-2xl overflow-hidden">
                    {events[dateLabel].map((event: any, j: number) => (
                        <div key={j} className="p-4 border-b border-zinc-800 last:border-0 flex justify-between items-center hover:bg-zinc-900/50 transition-colors">
                            
                            {/* Left Side: Icon & Info */}
                            <div className="flex items-center gap-3">
                                {event.category === 'INCOME' ? (
                                    // INCOME EVENT ICON (Green Money)
                                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex flex-col items-center justify-center border border-green-500/20 text-green-500">
                                        <DollarSign size={20} />
                                    </div>
                                ) : (
                                    // MARKET EVENT ICON (Ticker Box)
                                    <div className="w-12 h-12 bg-zinc-900 rounded-xl flex flex-col items-center justify-center border border-zinc-800">
                                        <span className="font-bold text-white text-xs">{event.ticker.substring(0,4)}</span>
                                    </div>
                                )}

                                <div>
                                    <div className="font-bold text-white text-sm flex items-center gap-2">
                                        {event.name}
                                        {event.category === 'INCOME' && (
                                            <span className="bg-green-500 text-black text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">You</span>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide
                                            ${event.type === 'Earnings' ? 'bg-purple-500/20 text-purple-400' : 
                                              event.type === 'Economic' ? 'bg-blue-500/20 text-blue-400' : 
                                              'bg-green-500/20 text-green-400'}`}>
                                            {event.type}
                                        </span>
                                        
                                        {event.category === 'MARKET' ? (
                                            <span className="text-zinc-500 text-xs flex items-center gap-1">
                                                <Clock size={10} /> {event.time}
                                            </span>
                                        ) : (
                                            <span className="text-zinc-500 text-xs flex items-center gap-1">
                                                {event.currency === 'USD' ? '$' : event.currency}{event.amountPerShare}/share
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Values */}
                            <div className="text-right">
                                {event.category === 'INCOME' ? (
                                    <>
                                        <div className="text-green-400 font-mono text-lg font-bold flex items-center justify-end gap-0.5">
                                            <span className="text-sm opacity-70">+</span>
                                            {event.currency === 'USD' ? '$' : event.currency}{event.totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <div className="text-zinc-600 text-[10px] font-bold uppercase">Est. Payout</div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-zinc-300 font-mono text-sm font-medium">{event.meta}</div>
                                        <div className="text-zinc-600 text-[10px] font-bold uppercase">Forecast</div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;