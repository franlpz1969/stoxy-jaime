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
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Calendar</h1>
                    <p className="text-gray-500 dark:text-zinc-500 text-sm">Market events & income schedule</p>
                </div>
                <button className="p-3 rounded-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 shadow-sm">
                    <CalendarIcon size={24} />
                </button>
            </div>

            <div className="space-y-8">
                {groupKeys.map((dateLabel, i) => (
                    <div key={i}>
                        <h3 className="text-gray-500 dark:text-zinc-500 font-bold text-sm uppercase mb-3 pl-3 border-l-4 border-blue-500">{dateLabel}</h3>
                        <div className="bg-white dark:bg-[#151517] border border-gray-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            {events[dateLabel].map((event: any, j: number) => (
                                <div key={j} className="p-5 border-b border-gray-100 dark:border-zinc-800 last:border-0 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors">

                                    {/* Left Side: Icon & Info */}
                                    <div className="flex items-center gap-4">
                                        {event.category === 'INCOME' ? (
                                            // INCOME EVENT ICON (Green Money)
                                            <div className="w-14 h-14 bg-green-50 dark:bg-green-500/10 rounded-2xl flex flex-col items-center justify-center border border-green-100 dark:border-green-500/20 text-green-600 dark:text-green-500 shadow-sm">
                                                <DollarSign size={24} />
                                            </div>
                                        ) : (
                                            // MARKET EVENT ICON (Ticker Box)
                                            <div className="w-14 h-14 bg-gray-100 dark:bg-zinc-900 rounded-2xl flex flex-col items-center justify-center border border-gray-200 dark:border-zinc-800 shadow-sm">
                                                <span className="font-bold text-gray-900 dark:text-white text-sm">{event.ticker.substring(0, 4)}</span>
                                            </div>
                                        )}

                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                                {event.name}
                                                {event.category === 'INCOME' && (
                                                    <span className="bg-green-100 dark:bg-green-500 text-green-700 dark:text-black text-[10px] px-2 py-0.5 rounded font-bold uppercase">You</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wide
                                            ${event.type === 'Earnings' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                                                        event.type === 'Economic' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                                                            'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400'}`}>
                                                    {event.type}
                                                </span>

                                                {event.category === 'MARKET' ? (
                                                    <span className="text-gray-500 dark:text-zinc-500 text-sm flex items-center gap-1 font-medium">
                                                        <Clock size={12} /> {event.time}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 dark:text-zinc-500 text-sm flex items-center gap-1 font-medium">
                                                        {event.currency === 'USD' ? '$' : event.currency}{event.amountPerShare}/share
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: Values */}
                                    <div className="text-right pl-2">
                                        {event.category === 'INCOME' ? (
                                            <>
                                                <div className="text-green-600 dark:text-green-400 font-mono text-xl font-bold flex items-center justify-end gap-0.5">
                                                    <span className="text-sm opacity-70">+</span>
                                                    {event.currency === 'USD' ? '$' : event.currency}{event.totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-gray-400 dark:text-zinc-600 text-xs font-bold uppercase">Est. Payout</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-gray-700 dark:text-zinc-300 font-mono text-lg font-bold">{event.meta}</div>
                                                <div className="text-gray-400 dark:text-zinc-600 text-xs font-bold uppercase">Forecast</div>
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