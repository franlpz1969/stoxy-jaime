import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, Globe, Gauge, Search, Clock, ChevronRight, Hash, DollarSign, Bitcoin, Droplets, Landmark, BarChart2, X, Loader2 } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, LineChart, Line } from 'recharts';
import { PortfolioPosition } from '../types';
import { fetchMarketSentiment, searchSymbols, fetchStockPrice, getCompanyLogo } from '../services/geminiService';

interface MarketsViewProps {
    portfolio?: PortfolioPosition[];
    onSelectMarketItem?: (item: any) => void;
}

// --- CONSTANTS & MOCK DATA ---

const CATEGORIES = ['Overview', 'Indices', 'Stocks', 'Crypto', 'Commodities', 'Bonds', 'Futures', 'Derivatives'];
const REGIONS = ['US', 'EU', 'ASIA'];
const MOVER_TYPES = ['Movers', 'Gainers', 'Losers'];

// Overview Specific Data
const INDICES_OVERVIEW: Record<string, any[]> = {
    'US': [
        { name: 'Dow', value: '48,458.05', change: -0.51, isUp: false, label: 'Dow Jones' },
        { name: 'S&P 500', value: '6,827.41', change: -1.07, isUp: false, label: 'S&P 500' },
        { name: 'NASDAQ', value: '23,195.17', change: -1.69, isUp: false, label: 'Nasdaq Composite' },
    ],
    'EU': [
        { name: 'DAX', value: '18,450.20', change: 0.45, isUp: true, label: 'DAX Performance' },
        { name: 'FTSE 100', value: '8,230.15', change: -0.12, isUp: false, label: 'Financial Times' },
        { name: 'CAC 40', value: '7,980.50', change: 0.23, isUp: true, label: 'CAC 40' },
    ],
    'ASIA': [
        { name: 'Nikkei 225', value: '39,850.00', change: 1.20, isUp: true, label: 'Nikkei 225' },
        { name: 'Hang Seng', value: '16,700.40', change: -0.80, isUp: false, label: 'Hang Seng Index' },
        { name: 'Shanghai', value: '3,050.10', change: 0.10, isUp: true, label: 'SSE Composite' },
    ]
};

// Full Lists Data are now computed inside the component or via useMemo if needed
// to ensure getCompanyLogo() is called with the latest logic.

const CRYPTO_DATA = [
    { symbol: 'BTC', name: 'Bitcoin', price: 68450.00, changePct: 2.50, isUp: true, logo: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png' },
    { symbol: 'ETH', name: 'Ethereum', price: 3890.10, changePct: -1.20, isUp: false, logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
    { symbol: 'SOL', name: 'Solana', price: 145.20, changePct: 5.40, isUp: true, logo: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
    { symbol: 'XRP', name: 'XRP', price: 0.62, changePct: 0.50, isUp: true, logo: 'https://cryptologos.cc/logos/xrp-xrp-logo.png' },
    { symbol: 'ADA', name: 'Cardano', price: 0.45, changePct: -2.30, isUp: false, logo: 'https://cryptologos.cc/logos/cardano-ada-logo.png' },
];

const COMMODITIES_DATA = [
    { symbol: 'XAU', name: 'Gold Spot', price: 2350.10, changePct: 0.80, isUp: true, icon: Droplets },
    { symbol: 'XAG', name: 'Silver Spot', price: 27.80, changePct: 1.50, isUp: true, icon: Droplets },
    { symbol: 'WTI', name: 'Crude Oil WTI', price: 85.40, changePct: -0.20, isUp: false, icon: Droplets },
    { symbol: 'BRENT', name: 'Brent Oil', price: 89.10, changePct: -0.15, isUp: false, icon: Droplets },
    { symbol: 'NG', name: 'Natural Gas', price: 1.85, changePct: 3.20, isUp: true, icon: Droplets },
];

const INDICES_FULL_DATA = [
    { symbol: 'SPX', name: 'S&P 500', price: 5234.12, changePct: 1.25, isUp: true, icon: Hash },
    { symbol: 'NDX', name: 'Nasdaq 100', price: 18342.10, changePct: 1.84, isUp: true, icon: Hash },
    { symbol: 'DJI', name: 'Dow Jones', price: 39120.80, changePct: -0.45, isUp: false, icon: Hash },
    { symbol: 'RUT', name: 'Russell 2000', price: 2012.33, changePct: 0.12, isUp: true, icon: Hash },
    { symbol: 'VIX', name: 'Volatility Index', price: 13.45, changePct: -5.20, isUp: false, icon: Hash },
    { symbol: 'UK100', name: 'FTSE 100', price: 8230.15, changePct: -0.12, isUp: false, icon: Hash },
];

const BONDS_DATA = [
    { symbol: 'US10Y', name: 'US 10Y Treasury', price: 4.25, changePct: 1.20, isUp: true, icon: Landmark },
    { symbol: 'US2Y', name: 'US 2Y Treasury', price: 4.65, changePct: 0.50, isUp: true, icon: Landmark },
    { symbol: 'DE10Y', name: 'Germany 10Y Bund', price: 2.35, changePct: -1.10, isUp: false, icon: Landmark },
    { symbol: 'JP10Y', name: 'Japan 10Y JGB', price: 0.75, changePct: 2.40, isUp: true, icon: Landmark },
];

const FUTURES_DATA = [
    { symbol: 'ES', name: 'E-Mini S&P 500', price: 5250.50, changePct: 0.15, isUp: true, icon: BarChart2 },
    { symbol: 'NQ', name: 'E-Mini Nasdaq', price: 18400.25, changePct: 0.30, isUp: true, icon: BarChart2 },
    { symbol: 'CL', name: 'Crude Oil Futures', price: 85.60, changePct: -0.40, isUp: false, icon: BarChart2 },
    { symbol: 'GC', name: 'Gold Futures', price: 2360.50, changePct: 0.90, isUp: true, icon: BarChart2 },
];

// --- HELPER COMPONENTS ---

const MiniSparkline = ({ isUp }: { isUp: boolean }) => {
    const data = useMemo(() => {
        let val = 50;
        const pts = [];
        for (let i = 0; i < 20; i++) {
            val = val + (Math.random() - 0.5) * 10 + (isUp ? 2 : -2);
            pts.push({ v: val });
        }
        return pts;
    }, [isUp]);

    return (
        <div className="h-8 w-16 opacity-70">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <Line type="monotone" dataKey="v" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

interface MarketListItemProps {
    item: any;
    onClick: () => void;
    showType?: boolean;
}

const MarketListItem: React.FC<MarketListItemProps> = ({ item, onClick, showType = false }) => {
    const formattedPrice = item.price ? item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-.--';

    // Robust image handling state
    const [imgSrc, setImgSrc] = useState(item.logo || getCompanyLogo(item.symbol));
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
        setImgSrc(item.logo || getCompanyLogo(item.symbol));
        setImgError(false);
    }, [item.logo, item.symbol]);

    const handleError = () => {
        // If our primary dynamic URL fails, fallback to simple favicon query
        if (imgSrc && !imgSrc.includes('google.com/s2/favicons')) {
            const domain = item.symbol.split('.')[0].toLowerCase() + '.com';
            setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
        } else {
            setImgError(true);
        }
    };

    return (
        <div
            className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-zinc-800"
            onClick={onClick}
        >
            {/* Left: Identity */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                {(item.logo && !imgError) ? (
                    <div className="w-14 h-14 rounded-full bg-white border border-gray-100 dark:border-zinc-800 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-sm">
                        <img
                            src={imgSrc}
                            alt={item.symbol}
                            className="w-full h-full object-contain"
                            onError={handleError}
                        />
                    </div>
                ) : (
                    <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-gray-500 dark:text-zinc-400">
                        {item.icon ? <item.icon size={26} /> : <span className="font-bold text-base">{item.symbol.substring(0, 2)}</span>}
                    </div>
                )}
                <div className="overflow-hidden">
                    <div className="text-gray-900 dark:text-white font-bold text-lg truncate flex items-center gap-2">
                        {item.name}
                        {showType && item.category && (
                            <span className="text-[11px] bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">{item.category}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-base">
                        {item.changePct < 0 && <Clock size={14} className="text-red-500 dark:text-[#ef4444]" />}
                        <span className="text-gray-500 dark:text-zinc-500 font-bold">{item.symbol}</span>
                    </div>
                </div>
            </div>

            {/* Middle: Sparkline */}
            <div className="flex-1 flex justify-center hidden sm:flex">
                <MiniSparkline isUp={item.isUp} />
            </div>

            {/* Right: Data */}
            <div className="text-right w-[110px] pl-2">
                <div className="text-gray-900 dark:text-white font-bold text-lg mb-1">{formattedPrice}</div>
                <div className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-sm font-bold text-white min-w-[70px] ${item.isUp ? 'bg-green-500 dark:bg-[#22c55e]' : 'bg-red-500 dark:bg-[#ef4444]'
                    }`}>
                    {item.changePct > 0 ? '+' : ''}{item.changePct.toFixed(2)}%
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const MarketsView: React.FC<MarketsViewProps> = ({ portfolio = [], onSelectMarketItem }) => {
    // Navigation State
    const [activeCategory, setActiveCategory] = useState('Overview');
    const [activeRegion, setActiveRegion] = useState('US');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [activeMoverTab, setActiveMoverTab] = useState('Movers');

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sentiment State
    const [sentiment, setSentiment] = useState<{ score: number; label: string }>({ score: 50, label: 'Loading...' });

    useEffect(() => {
        let mounted = true;
        const loadSentiment = async () => {
            try {
                const data = await fetchMarketSentiment();
                if (mounted) {
                    setSentiment(data);
                }
            } catch (e) {
                console.error(e);
            }
        };
        loadSentiment();
        return () => { mounted = false; };
    }, []);

    // Overview Chart Logic
    const currentIndices = INDICES_OVERVIEW[activeRegion];
    const selectedIndexData = currentIndices[selectedIndex];

    const chartData = useMemo(() => {
        const data = [];
        let price = parseFloat(selectedIndexData.value.replace(/,/g, ''));
        const isUp = selectedIndexData.isUp;
        const points = 50;
        for (let i = 0; i < points; i++) {
            const volatility = (Math.random() - 0.5) * (price * 0.005);
            const trend = (isUp ? 1 : -1) * (price * 0.0005);
            price = price - trend - volatility;
            data.unshift({ time: i, value: price });
        }
        return data;
    }, [selectedIndexData]);

    const chartColor = selectedIndexData.isUp ? '#22c55e' : '#ef4444';

    const getSentimentColor = (score: number) => {
        // Exact CNN Color ranges
        if (score < 25) return "text-[#ef4444]"; // Extreme Fear (Dark Red)
        if (score < 45) return "text-[#f97316]"; // Fear (Orange)
        if (score < 55) return "text-[#d4d4d8]"; // Neutral (Grey)
        if (score < 75) return "text-[#84cc16]"; // Greed (Light Green)
        return "text-[#22c55e]"; // Extreme Greed (Dark Green)
    };

    // Helper to handle clicks generically
    const handleItemClick = (item: any) => {
        if (onSelectMarketItem) {
            onSelectMarketItem({
                symbol: item.symbol,
                name: item.name,
                value: item.price.toString(),
                change: item.changePct
            });
        }
    };

    // Moving Mock Data inside component to ensure getCompanyLogo() is reactive
    const MOVERS_DATA = useMemo(() => [
        { symbol: 'NVDA', name: 'NVIDIA Corp', price: 135.02, changePct: -3.27, isUp: false, logo: getCompanyLogo('NVDA'), category: 'STOCK' },
        { symbol: 'SMCI', name: 'Super Micro Computer', price: 38.38, changePct: -5.34, isUp: false, logo: getCompanyLogo('SMCI'), category: 'STOCK' },
        { symbol: 'TSLA', name: 'Tesla Inc', price: 218.50, changePct: 1.45, isUp: true, logo: getCompanyLogo('TSLA'), category: 'STOCK' },
        { symbol: 'PLTR', name: 'Palantir Tech', price: 62.50, changePct: 0.85, isUp: true, logo: getCompanyLogo('PLTR'), category: 'STOCK' }
    ], []);

    const STOCKS_DATA = useMemo(() => [
        { symbol: 'AAPL', name: 'Apple Inc.', price: 232.45, changePct: 1.25, isUp: true, logo: getCompanyLogo('AAPL') },
        { symbol: 'MSFT', name: 'Microsoft Corp', price: 420.45, changePct: 0.85, isUp: true, logo: getCompanyLogo('MSFT') },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 168.20, changePct: -0.55, isUp: false, logo: getCompanyLogo('GOOGL') },
        { symbol: 'AMZN', name: 'Amazon.com', price: 180.15, changePct: 1.10, isUp: true, logo: getCompanyLogo('AMZN') },
        { symbol: 'META', name: 'Meta Platforms', price: 495.60, changePct: 2.15, isUp: true, logo: getCompanyLogo('META') },
        { symbol: 'AMD', name: 'Advanced Micro Devices', price: 178.50, changePct: 4.30, isUp: true, logo: getCompanyLogo('AMD') },
        { symbol: 'NFLX', name: 'Netflix Inc', price: 615.00, changePct: -1.05, isUp: false, logo: getCompanyLogo('NFLX') },
        { symbol: 'ABNB', name: 'Airbnb Inc', price: 165.20, changePct: 0.45, isUp: true, logo: getCompanyLogo('ABNB') },
        { symbol: 'ADBE', name: 'Adobe Inc', price: 480.10, changePct: -1.20, isUp: false, logo: getCompanyLogo('ADBE') },
    ], []);

    // --- SEARCH LOGIC (REAL API) ---

    // 1. Static Local Items for quick fallback
    const allStaticItems = useMemo(() => {
        return [
            ...MOVERS_DATA.map(i => ({ ...i, category: 'STOCK' })),
            ...STOCKS_DATA.map(i => ({ ...i, category: 'STOCK' })),
            ...CRYPTO_DATA.map(i => ({ ...i, category: 'CRYPTO' })),
            ...INDICES_FULL_DATA.map(i => ({ ...i, category: 'INDEX' })),
            ...COMMODITIES_DATA.map(i => ({ ...i, category: 'COMMODITY' })),
            ...BONDS_DATA.map(i => ({ ...i, category: 'BOND' })),
            ...FUTURES_DATA.map(i => ({ ...i, category: 'FUTURE' })),
        ];
    }, []);

    useEffect(() => {
        // Debounce logic
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!searchQuery) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const lowerQuery = searchQuery.toLowerCase();

                // 1. Local Search (Instant)
                const localMatches = allStaticItems.filter((item: any) =>
                    item.name.toLowerCase().includes(lowerQuery) ||
                    item.symbol.toLowerCase().includes(lowerQuery)
                );

                // 2. API Search (Remote)
                const apiResultsRaw = await searchSymbols(searchQuery);

                // Filter out things we already found locally to avoid dupes
                const newApiResults = apiResultsRaw.filter(
                    apiItem => !localMatches.some(local => local.symbol === apiItem.symbol)
                ).slice(0, 5); // Limit to top 5 from API to be fast

                // 3. Fetch Prices for API results (to make them clickable/usable)
                const enrichedApiResults = await Promise.all(newApiResults.map(async (item) => {
                    try {
                        // Fetch real price
                        const priceData = await fetchStockPrice(item.symbol);
                        return {
                            symbol: item.symbol,
                            name: item.description || item.symbol,
                            price: priceData?.price || 0,
                            changePct: priceData?.change || 0,
                            isUp: (priceData?.change || 0) >= 0,
                            logo: `https://logo.clearbit.com/${item.symbol.toLowerCase()}.com`, // Fallback logic will handle errors
                            category: item.type || 'STOCK'
                        };
                    } catch (e) {
                        return null;
                    }
                }));

                const validEnriched = enrichedApiResults.filter(item => item !== null);

                setSearchResults([...localMatches, ...validEnriched]);

            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        }, 500); // 500ms debounce

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };

    }, [searchQuery, allStaticItems]);


    const renderListView = (data: any[]) => {
        return (
            <div className="space-y-1 px-4">
                {data.map((item) => (
                    <MarketListItem key={item.symbol} item={item} onClick={() => handleItemClick(item)} />
                ))}
            </div>
        );
    };

    return (
        <div className="pb-24 animate-in fade-in duration-500 bg-white dark:bg-black min-h-screen flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-center px-4 py-4 sticky top-0 bg-white/95 dark:bg-black/95 backdrop-blur z-20 gap-4">
                <div className="w-10 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 overflow-hidden">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                    </div>
                </div>

                {/* Functional Search Bar */}
                <div className="flex-1 relative group">
                    {isSearching ? (
                        <Loader2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
                    ) : (
                        <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchQuery ? 'text-blue-500' : 'text-gray-400 dark:text-zinc-500'}`} />
                    )}
                    <input
                        type="text"
                        placeholder="Search symbol, company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full py-3 pl-10 pr-10 text-base text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition-all placeholder-gray-500 dark:placeholder-zinc-600 shadow-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 dark:text-zinc-500 dark:hover:text-white bg-gray-200 dark:bg-zinc-800 rounded-full p-1 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* --- CONDITIONAL RENDERING: SEARCH RESULTS vs MAIN VIEW --- */}

            {searchQuery ? (
                // SEARCH RESULTS VIEW
                <div className="flex-1 px-4 animate-in fade-in duration-300">
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 mt-2">
                        {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''}
                    </div>

                    {!isSearching && searchResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="text-zinc-400 font-medium">No results found for "{searchQuery}"</p>
                            <p className="text-xs mt-1">Try searching for symbols (e.g., V, AAPL) or names.</p>
                        </div>
                    ) : (
                        <div className="space-y-1 pb-4">
                            {searchResults.map((item) => (
                                <MarketListItem
                                    key={`${item.symbol}-${item.category}`}
                                    item={item}
                                    onClick={() => handleItemClick(item)}
                                    showType={true}
                                />
                            ))}
                            {isSearching && (
                                <div className="py-4 flex justify-center text-zinc-600">
                                    <Loader2 className="animate-spin" size={24} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                // NORMAL TABS VIEW
                <>
                    {/* Category Tabs */}
                    <div className="px-4 mb-4">
                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => { setActiveCategory(cat); setSearchQuery(''); }}
                                    className={`whitespace-nowrap text-sm font-bold px-4 py-1.5 rounded-full transition-colors ${activeCategory === cat
                                        ? 'bg-black dark:bg-[#27272a] text-white dark:text-blue-400'
                                        : 'text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* --- CONTENT SWITCHER --- */}

                    {activeCategory === 'Overview' && (
                        <>
                            {/* Market Status */}
                            <div className="px-6 mb-4 flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wide">
                                <Clock size={14} className="-mt-0.5 fill-blue-400/20" />
                                <span>U.S. Markets Closed</span>
                            </div>

                            {/* Overview Chart Card */}
                            <div className="mx-4 bg-white dark:bg-[#151517] border border-gray-200 dark:border-zinc-800 rounded-3xl p-5 mb-6 shadow-sm">
                                <div className="flex gap-6 mb-6 border-b border-gray-100 dark:border-zinc-800 pb-2">
                                    {REGIONS.map(region => (
                                        <button
                                            key={region}
                                            onClick={() => { setActiveRegion(region); setSelectedIndex(0); }}
                                            className={`text-sm sm:text-base font-bold pb-2 -mb-2.5 transition-colors border-b-2 whitespace-nowrap ${activeRegion === region
                                                ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                                                : 'text-gray-400 dark:text-zinc-500 border-transparent hover:text-gray-600 dark:hover:text-zinc-300'
                                                }`}
                                        >
                                            {region}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex justify-between items-start mb-6 overflow-x-auto gap-4">
                                    {currentIndices.map((idx, i) => (
                                        <div
                                            key={idx.name}
                                            onClick={() => setSelectedIndex(i)}
                                            className={`cursor-pointer transition-opacity min-w-[100px] ${selectedIndex === i ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                                        >
                                            <div className="text-gray-500 dark:text-zinc-200 font-bold text-base mb-1">{idx.name}</div>
                                            <div className="text-gray-900 dark:text-white font-mono text-base font-bold mb-0.5">{idx.value}</div>
                                            <div className={`text-sm font-bold ${idx.isUp ? 'text-green-600 dark:text-[#22c55e]' : 'text-red-600 dark:text-[#ef4444]'}`}>
                                                {idx.change}%
                                            </div>
                                            {selectedIndex === i && (
                                                <div className={`h-0.5 w-full mt-2 rounded-full ${idx.isUp ? 'bg-green-600 dark:bg-[#22c55e]' : 'bg-red-600 dark:bg-[#ef4444]'}`}></div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="h-40 w-full mb-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="gradientColor" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke={chartColor}
                                                strokeWidth={2}
                                                fill="url(#gradientColor)"
                                                isAnimationActive={true}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Movers Section */}
                            <div className="mx-4 bg-white dark:bg-[#151517] border border-gray-200 dark:border-zinc-800 rounded-3xl p-5 mb-6 shadow-sm">
                                <div className="flex gap-6 mb-4">
                                    {MOVER_TYPES.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setActiveMoverTab(type)}
                                            className={`text-lg sm:text-xl font-bold transition-colors whitespace-nowrap ${activeMoverTab === type
                                                ? 'text-blue-600 dark:text-blue-400'
                                                : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    {MOVERS_DATA.map((stock) => (
                                        <MarketListItem key={stock.symbol} item={stock} onClick={() => handleItemClick(stock)} />
                                    ))}
                                </div>
                            </div>

                            {/* Fear & Greed Index (CNN Style) */}
                            <div className="mx-4 mb-8">
                                <div className="flex items-center gap-2 mb-3 px-2">
                                    <Gauge size={16} className="text-zinc-400" />
                                    <h2 className="text-zinc-400 text-sm font-bold uppercase">CNN Fear & Greed</h2>
                                </div>

                                <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-zinc-800 rounded-3xl p-6 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-6">
                                        <div className="relative w-24 h-12 overflow-hidden">
                                            {/* CNN Specific Ranges: 0-25 (Red), 25-45 (Orange), 45-55 (Grey), 55-75 (Light Green), 75-100 (Green) */}
                                            <div className="w-24 h-24 rounded-full absolute top-0 left-0" style={{ background: `conic-gradient(from 270deg at 50% 50%, #ef4444 0deg 45deg, #f97316 45deg 81deg, #d4d4d8 81deg 99deg, #84cc16 99deg 135deg, #22c55e 135deg 180deg, transparent 180deg)` }} />
                                            <div className="w-16 h-16 bg-white dark:bg-[#1C1C1E] rounded-full absolute top-4 left-4 z-10" />
                                            <div className="absolute bottom-0 left-1/2 w-1 h-12 bg-black dark:bg-white origin-bottom z-20 transition-transform duration-1000 ease-out border border-white dark:border-black" style={{ transform: `translateX(-50%) rotate(${(sentiment.score / 100) * 180 - 90}deg)` }} />
                                        </div>
                                        <div>
                                            <div className={`text-2xl font-black uppercase leading-none ${getSentimentColor(sentiment.score)}`}>
                                                {sentiment.label}
                                            </div>
                                            <div className="text-gray-500 dark:text-zinc-500 text-xs font-bold mt-1">Official Market Index</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-gray-900 dark:text-white font-black text-3xl">{Math.round(sentiment.score)}</div>
                                        <div className="text-gray-400 dark:text-zinc-600 text-[10px] font-bold uppercase tracking-wider">Score</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- SPECIFIC TABS RENDERED WITH LISTS --- */}

                    {activeCategory === 'Indices' && renderListView(INDICES_FULL_DATA)}
                    {activeCategory === 'Stocks' && renderListView(STOCKS_DATA)}
                    {activeCategory === 'Crypto' && renderListView(CRYPTO_DATA)}
                    {activeCategory === 'Commodities' && renderListView(COMMODITIES_DATA)}
                    {activeCategory === 'Bonds' && renderListView(BONDS_DATA)}
                    {activeCategory === 'Futures' && renderListView(FUTURES_DATA)}
                    {activeCategory === 'Derivatives' && (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                            <Globe size={48} className="mb-4 opacity-20" />
                            <p className="font-bold text-lg text-zinc-500">No Derivatives Data</p>
                            <p className="text-xs">Market data unavailable for this region.</p>
                        </div>
                    )}
                </>
            )}

        </div>
    );
};

export default MarketsView;
