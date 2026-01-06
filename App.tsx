import React, { useState, useMemo, useEffect } from 'react';
import { BarChart2, Newspaper, Calendar, PieChart, Wallet, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import TransactionModal from './components/TransactionModal';
import AddStockModal from './components/AddStockModal';
import SettingsView from './components/SettingsView';
import PortfolioView from './components/PortfolioView';
import MarketsView from './components/MarketsView';
import NewsView from './components/NewsView';
import CalendarView from './components/CalendarView';
import ChartsView from './components/ChartsView';
import LandingView from './components/LandingView';
import StockDetailView from './components/StockDetailView';
import PortfolioAnalysisModal from './components/PortfolioAnalysisModal';
import { AuthProvider, useAuth } from './components/AuthContext';
import { fetchStockData, fetchStockPrice, analyzePortfolioData } from './services/geminiService';
import { PortfolioPosition, StockSearchInputs, Transaction, TransactionType, StockData, Portfolio } from './types';

// Polyfill for crypto.randomUUID() in HTTP contexts
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  (crypto as any).randomUUID = function (): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}


type Tab = 'portfolio' | 'markets' | 'calendar' | 'news' | 'charts';

const EXCHANGE_RATES: Record<string, number> = {
  'USD': 1.0,
  'EUR': 0.92,
  'GBP': 0.79,
  'JPY': 151.50,
  'CAD': 1.36,
  'AUD': 1.52
};

function AppContent() {
  const { getAuthHeaders, isAuthenticated, isLoading: authLoading, user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('portfolio');
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    // Initialize from localStorage or default to dark
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stoxy-theme');
      return saved === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  });
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [user, setUser] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sync theme with document and localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('stoxy-theme', theme);
  }, [theme]);

  // --- PORTFOLIO 1: GLOBAL INSTITUTIONAL CORE (~$10M) ---
  const globalCorePositions: PortfolioPosition[] = [
    { id: 'gc-1', stock: { symbol: 'SPY', companyName: 'SPDR S&P 500 ETF', currentPrice: 520.00, currency: 'USD', dayChangePercent: 0.45, sector: 'ETF', country: 'USA' }, transactions: [{ id: 't1', type: 'BUY', shares: 2000, price: 480, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-2', stock: { symbol: 'QQQ', companyName: 'Invesco QQQ Trust', currentPrice: 440.00, currency: 'USD', dayChangePercent: 0.65, sector: 'ETF', country: 'USA' }, transactions: [{ id: 't2', type: 'BUY', shares: 1500, price: 400, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-3', stock: { symbol: 'VEA', companyName: 'Vanguard Developed Markets', currentPrice: 50.00, currency: 'USD', dayChangePercent: 0.20, sector: 'ETF', country: 'Global' }, transactions: [{ id: 't3', type: 'BUY', shares: 10000, price: 45, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-4', stock: { symbol: 'VWO', companyName: 'Vanguard Emerging Markets', currentPrice: 42.00, currency: 'USD', dayChangePercent: -0.30, sector: 'ETF', country: 'Emerging Markets' }, transactions: [{ id: 't4', type: 'BUY', shares: 12000, price: 40, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-5', stock: { symbol: 'AAPL', companyName: 'Apple Inc.', currentPrice: 172.00, currency: 'USD', dayChangePercent: 1.25, sector: 'Technology', country: 'USA' }, transactions: [{ id: 't5', type: 'BUY', shares: 2500, price: 150, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-6', stock: { symbol: 'MSFT', companyName: 'Microsoft Corp', currentPrice: 420.00, currency: 'USD', dayChangePercent: 0.85, sector: 'Technology', country: 'USA' }, transactions: [{ id: 't6', type: 'BUY', shares: 1200, price: 350, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-7', stock: { symbol: 'JPM', companyName: 'JPMorgan Chase & Co', currentPrice: 200.00, currency: 'USD', dayChangePercent: 0.50, sector: 'Financial Services', country: 'USA' }, transactions: [{ id: 't7', type: 'BUY', shares: 2000, price: 160, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-8', stock: { symbol: 'UNH', companyName: 'UnitedHealth Group', currentPrice: 480.00, currency: 'USD', dayChangePercent: -0.40, sector: 'Healthcare', country: 'USA' }, transactions: [{ id: 't8', type: 'BUY', shares: 1000, price: 490, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-9', stock: { symbol: 'V', companyName: 'Visa Inc.', currentPrice: 280.00, currency: 'USD', dayChangePercent: 0.30, sector: 'Financial Services', country: 'USA' }, transactions: [{ id: 't9', type: 'BUY', shares: 1500, price: 240, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-10', stock: { symbol: 'PG', companyName: 'Procter & Gamble', currentPrice: 162.00, currency: 'USD', dayChangePercent: 0.15, sector: 'Consumer Defensive', country: 'USA' }, transactions: [{ id: 't10', type: 'BUY', shares: 2500, price: 145, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-11', stock: { symbol: 'JNJ', companyName: 'Johnson & Johnson', currentPrice: 155.00, currency: 'USD', dayChangePercent: -0.20, sector: 'Healthcare', country: 'USA' }, transactions: [{ id: 't11', type: 'BUY', shares: 2500, price: 160, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-12', stock: { symbol: 'ASML', companyName: 'ASML Holding NV', currentPrice: 950.00, currency: 'USD', dayChangePercent: 2.10, sector: 'Technology', country: 'Netherlands' }, transactions: [{ id: 't12', type: 'BUY', shares: 450, price: 700, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-13', stock: { symbol: 'MC.PA', companyName: 'LVMH Moët Hennessy', currentPrice: 850.00, currency: 'EUR', dayChangePercent: 1.40, sector: 'Consumer Cyclical', country: 'France' }, transactions: [{ id: 't13', type: 'BUY', shares: 500, price: 750, date: new Date() }], userCurrency: 'EUR' },
    { id: 'gc-14', stock: { symbol: 'TSM', companyName: 'Taiwan Semiconductor', currentPrice: 140.00, currency: 'USD', dayChangePercent: 3.20, sector: 'Technology', country: 'Taiwan' }, transactions: [{ id: 't14', type: 'BUY', shares: 3000, price: 95, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-15', stock: { symbol: 'SAP', companyName: 'SAP SE', currentPrice: 185.00, currency: 'EUR', dayChangePercent: 0.50, sector: 'Technology', country: 'Germany' }, transactions: [{ id: 't15', type: 'BUY', shares: 2200, price: 140, date: new Date() }], userCurrency: 'EUR' },
    { id: 'gc-16', stock: { symbol: 'NVO', companyName: 'Novo Nordisk', currentPrice: 130.00, currency: 'USD', dayChangePercent: 1.80, sector: 'Healthcare', country: 'Denmark' }, transactions: [{ id: 't16', type: 'BUY', shares: 3500, price: 100, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-17', stock: { symbol: 'TM', companyName: 'Toyota Motor Corp', currentPrice: 245.00, currency: 'USD', dayChangePercent: 0.60, sector: 'Consumer Cyclical', country: 'Japan' }, transactions: [{ id: 't17', type: 'BUY', shares: 1800, price: 190, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-18', stock: { symbol: 'BHP', companyName: 'BHP Group Ltd', currentPrice: 60.00, currency: 'USD', dayChangePercent: -1.10, sector: 'Basic Materials', country: 'Australia' }, transactions: [{ id: 't18', type: 'BUY', shares: 8000, price: 65, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-19', stock: { symbol: 'RIO', companyName: 'Rio Tinto Group', currentPrice: 68.00, currency: 'USD', dayChangePercent: -0.90, sector: 'Basic Materials', country: 'UK' }, transactions: [{ id: 't19', type: 'BUY', shares: 7000, price: 72, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-20', stock: { symbol: 'RY', companyName: 'Royal Bank of Canada', currentPrice: 102.00, currency: 'CAD', dayChangePercent: 0.40, sector: 'Financial Services', country: 'Canada' }, transactions: [{ id: 't20', type: 'BUY', shares: 5000, price: 95, date: new Date() }], userCurrency: 'CAD' },
    { id: 'gc-21', stock: { symbol: 'SHEL', companyName: 'Shell PLC', currentPrice: 72.00, currency: 'USD', dayChangePercent: 0.35, sector: 'Energy', country: 'UK' }, transactions: [{ id: 't21', type: 'BUY', shares: 6000, price: 60, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-22', stock: { symbol: 'HSBC', companyName: 'HSBC Holdings', currentPrice: 40.00, currency: 'USD', dayChangePercent: 0.10, sector: 'Financial Services', country: 'UK' }, transactions: [{ id: 't22', type: 'BUY', shares: 12000, price: 35, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-23', stock: { symbol: 'AZN', companyName: 'AstraZeneca PLC', currentPrice: 75.00, currency: 'USD', dayChangePercent: 0.70, sector: 'Healthcare', country: 'UK' }, transactions: [{ id: 't23', type: 'BUY', shares: 5500, price: 68, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-24', stock: { symbol: 'HDB', companyName: 'HDFC Bank Ltd', currentPrice: 58.00, currency: 'USD', dayChangePercent: -0.20, sector: 'Financial Services', country: 'India' }, transactions: [{ id: 't24', type: 'BUY', shares: 7000, price: 62, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-25', stock: { symbol: 'BABA', companyName: 'Alibaba Group', currentPrice: 78.00, currency: 'USD', dayChangePercent: 1.10, sector: 'Consumer Cyclical', country: 'China' }, transactions: [{ id: 't25', type: 'BUY', shares: 6000, price: 90, date: new Date() }], userCurrency: 'USD' },
    { id: 'gc-26', stock: { symbol: 'CASH', companyName: 'USD Cash Reserves', currentPrice: 1.00, currency: 'USD', dayChangePercent: 0.00, sector: 'Cash', country: 'USA' }, transactions: [{ id: 't26', type: 'BUY', shares: 500000, price: 1, date: new Date() }], userCurrency: 'USD' }
  ];

  // --- PORTFOLIO 2: INNOVATION & CRYPTO ALPHA (~$10M) ---
  const innovationPositions: PortfolioPosition[] = [
    { id: 'in-1', stock: { symbol: 'NVDA', companyName: 'NVIDIA Corp', currentPrice: 900.00, currency: 'USD', dayChangePercent: 2.45, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i1', type: 'BUY', shares: 1500, price: 450, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-2', stock: { symbol: 'META', companyName: 'Meta Platforms', currentPrice: 500.00, currency: 'USD', dayChangePercent: 1.80, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i2', type: 'BUY', shares: 2000, price: 320, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-3', stock: { symbol: 'GOOGL', companyName: 'Alphabet Inc.', currentPrice: 170.00, currency: 'USD', dayChangePercent: 0.50, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i3', type: 'BUY', shares: 5000, price: 135, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-4', stock: { symbol: 'AMZN', companyName: 'Amazon.com Inc.', currentPrice: 180.00, currency: 'USD', dayChangePercent: 1.10, sector: 'Consumer Cyclical', country: 'USA' }, transactions: [{ id: 'i4', type: 'BUY', shares: 4500, price: 145, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-5', stock: { symbol: 'TSLA', companyName: 'Tesla Inc.', currentPrice: 175.00, currency: 'USD', dayChangePercent: -2.30, sector: 'Consumer Cyclical', country: 'USA' }, transactions: [{ id: 'i5', type: 'BUY', shares: 3000, price: 210, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-6', stock: { symbol: 'PLTR', companyName: 'Palantir Technologies', currentPrice: 24.00, currency: 'USD', dayChangePercent: 3.50, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i6', type: 'BUY', shares: 25000, price: 15, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-7', stock: { symbol: 'SNOW', companyName: 'Snowflake Inc.', currentPrice: 160.00, currency: 'USD', dayChangePercent: -1.20, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i7', type: 'BUY', shares: 2000, price: 180, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-8', stock: { symbol: 'CRWD', companyName: 'CrowdStrike Holdings', currentPrice: 310.00, currency: 'USD', dayChangePercent: 2.05, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i8', type: 'BUY', shares: 1500, price: 240, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-9', stock: { symbol: 'PANW', companyName: 'Palo Alto Networks', currentPrice: 290.00, currency: 'USD', dayChangePercent: 0.80, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i9', type: 'BUY', shares: 1500, price: 320, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-10', stock: { symbol: 'AMD', companyName: 'Advanced Micro Devices', currentPrice: 180.00, currency: 'USD', dayChangePercent: 1.40, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i10', type: 'BUY', shares: 3500, price: 110, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-11', stock: { symbol: 'ARM', companyName: 'Arm Holdings PLC', currentPrice: 125.00, currency: 'USD', dayChangePercent: 4.10, sector: 'Technology', country: 'UK' }, transactions: [{ id: 'i11', type: 'BUY', shares: 4000, price: 75, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-12', stock: { symbol: 'BTC', companyName: 'Bitcoin', currentPrice: 68000.00, currency: 'USD', dayChangePercent: 3.50, logoUrl: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png', sector: 'Crypto', country: 'Global' }, transactions: [{ id: 'i12', type: 'BUY', shares: 15, price: 42000, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-13', stock: { symbol: 'ETH', companyName: 'Ethereum', currentPrice: 3500.00, currency: 'USD', dayChangePercent: 2.20, logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png', sector: 'Crypto', country: 'Global' }, transactions: [{ id: 'i13', type: 'BUY', shares: 150, price: 2200, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-14', stock: { symbol: 'SOL', companyName: 'Solana', currentPrice: 145.00, currency: 'USD', dayChangePercent: 5.80, logoUrl: 'https://cryptologos.cc/logos/solana-sol-logo.png', sector: 'Crypto', country: 'Global' }, transactions: [{ id: 'i14', type: 'BUY', shares: 1500, price: 65, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-15', stock: { symbol: 'COIN', companyName: 'Coinbase Global', currentPrice: 245.00, currency: 'USD', dayChangePercent: 6.20, sector: 'Financial Services', country: 'USA' }, transactions: [{ id: 'i15', type: 'BUY', shares: 2000, price: 130, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-16', stock: { symbol: 'MSTR', companyName: 'MicroStrategy Inc.', currentPrice: 1500.00, currency: 'USD', dayChangePercent: 7.40, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i16', type: 'BUY', shares: 350, price: 700, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-17', stock: { symbol: 'SMCI', companyName: 'Super Micro Computer', currentPrice: 1000.00, currency: 'USD', dayChangePercent: 4.80, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i17', type: 'BUY', shares: 500, price: 300, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-18', stock: { symbol: 'SHOP', companyName: 'Shopify Inc.', currentPrice: 75.00, currency: 'USD', dayChangePercent: 1.20, sector: 'Technology', country: 'Canada' }, transactions: [{ id: 'i18', type: 'BUY', shares: 8000, price: 62, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-19', stock: { symbol: 'SQ', companyName: 'Block Inc.', currentPrice: 80.00, currency: 'USD', dayChangePercent: 2.10, sector: 'Financial Services', country: 'USA' }, transactions: [{ id: 'i19', type: 'BUY', shares: 6000, price: 65, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-20', stock: { symbol: 'PYPL', companyName: 'PayPal Holdings', currentPrice: 65.00, currency: 'USD', dayChangePercent: -0.50, sector: 'Financial Services', country: 'USA' }, transactions: [{ id: 'i20', type: 'BUY', shares: 7000, price: 75, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-21', stock: { symbol: 'U', companyName: 'Unity Software', currentPrice: 28.00, currency: 'USD', dayChangePercent: -3.10, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i21', type: 'BUY', shares: 15000, price: 35, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-22', stock: { symbol: 'RBLX', companyName: 'Roblox Corp', currentPrice: 40.00, currency: 'USD', dayChangePercent: 0.90, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i22', type: 'BUY', shares: 10000, price: 38, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-23', stock: { symbol: 'NET', companyName: 'Cloudflare Inc.', currentPrice: 95.00, currency: 'USD', dayChangePercent: 1.40, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i23', type: 'BUY', shares: 4500, price: 78, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-24', stock: { symbol: 'DDOG', companyName: 'Datadog Inc.', currentPrice: 125.00, currency: 'USD', dayChangePercent: 0.60, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i24', type: 'BUY', shares: 3500, price: 110, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-25', stock: { symbol: 'OKTA', companyName: 'Okta Inc.', currentPrice: 105.00, currency: 'USD', dayChangePercent: 0.40, sector: 'Technology', country: 'USA' }, transactions: [{ id: 'i25', type: 'BUY', shares: 4000, price: 90, date: new Date() }], userCurrency: 'USD' },
    { id: 'in-26', stock: { symbol: 'IBIT', companyName: 'iShares Bitcoin Trust', currentPrice: 38.00, currency: 'USD', dayChangePercent: 3.45, sector: 'ETF', country: 'USA' }, transactions: [{ id: 'i26', type: 'BUY', shares: 20000, price: 25, date: new Date() }], userCurrency: 'USD' }
  ];

  // --- PORTFOLIO 3: MACRO FORTRESS & REAL ASSETS (~$10M) ---
  const macroPositions: PortfolioPosition[] = [
    { id: 'ma-1', stock: { symbol: 'GLD', companyName: 'SPDR Gold Shares', currentPrice: 215.00, currency: 'USD', dayChangePercent: 0.85, sector: 'Basic Materials', country: 'Global' }, transactions: [{ id: 'm1', type: 'BUY', shares: 5000, price: 190, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-2', stock: { symbol: 'SLV', companyName: 'iShares Silver Trust', currentPrice: 25.00, currency: 'USD', dayChangePercent: 1.40, sector: 'Basic Materials', country: 'Global' }, transactions: [{ id: 'm2', type: 'BUY', shares: 40000, price: 22, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-3', stock: { symbol: 'CPER', companyName: 'United States Copper', currentPrice: 26.00, currency: 'USD', dayChangePercent: 2.10, sector: 'Basic Materials', country: 'Global' }, transactions: [{ id: 'm3', type: 'BUY', shares: 30000, price: 24, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-4', stock: { symbol: 'XOM', companyName: 'Exxon Mobil Corp', currentPrice: 120.00, currency: 'USD', dayChangePercent: -0.40, sector: 'Energy', country: 'USA' }, transactions: [{ id: 'm4', type: 'BUY', shares: 4500, price: 105, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-5', stock: { symbol: 'CVX', companyName: 'Chevron Corp', currentPrice: 160.00, currency: 'USD', dayChangePercent: -0.30, sector: 'Energy', country: 'USA' }, transactions: [{ id: 'm5', type: 'BUY', shares: 3500, price: 145, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-6', stock: { symbol: 'O', companyName: 'Realty Income Corp', currentPrice: 55.00, currency: 'USD', dayChangePercent: 0.65, sector: 'Real Estate', country: 'USA' }, transactions: [{ id: 'm6', type: 'BUY', shares: 15000, price: 52, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-7', stock: { symbol: 'AMT', companyName: 'American Tower Corp', currentPrice: 195.00, currency: 'USD', dayChangePercent: 0.40, sector: 'Real Estate', country: 'USA' }, transactions: [{ id: 'm7', type: 'BUY', shares: 2500, price: 210, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-8', stock: { symbol: 'PLD', companyName: 'Prologis Inc.', currentPrice: 125.00, currency: 'USD', dayChangePercent: 0.80, sector: 'Real Estate', country: 'USA' }, transactions: [{ id: 'm8', type: 'BUY', shares: 4000, price: 115, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-9', stock: { symbol: 'LMT', companyName: 'Lockheed Martin', currentPrice: 450.00, currency: 'USD', dayChangePercent: 0.25, sector: 'Industrials', country: 'USA' }, transactions: [{ id: 'm9', type: 'BUY', shares: 1200, price: 430, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-10', stock: { symbol: 'RTX', companyName: 'RTX Corporation', currentPrice: 95.00, currency: 'USD', dayChangePercent: 0.55, sector: 'Industrials', country: 'USA' }, transactions: [{ id: 'm10', type: 'BUY', shares: 6000, price: 85, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-11', stock: { symbol: 'CAT', companyName: 'Caterpillar Inc.', currentPrice: 350.00, currency: 'USD', dayChangePercent: 1.10, sector: 'Industrials', country: 'USA' }, transactions: [{ id: 'm11', type: 'BUY', shares: 1500, price: 280, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-12', stock: { symbol: 'DE', companyName: 'Deere & Company', currentPrice: 380.00, currency: 'USD', dayChangePercent: 0.70, sector: 'Industrials', country: 'USA' }, transactions: [{ id: 'm12', type: 'BUY', shares: 1500, price: 390, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-13', stock: { symbol: 'WM', companyName: 'Waste Management', currentPrice: 205.00, currency: 'USD', dayChangePercent: 0.30, sector: 'Industrials', country: 'USA' }, transactions: [{ id: 'm13', type: 'BUY', shares: 2500, price: 180, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-14', stock: { symbol: 'UPS', companyName: 'United Parcel Service', currentPrice: 145.00, currency: 'USD', dayChangePercent: -0.80, sector: 'Industrials', country: 'USA' }, transactions: [{ id: 'm14', type: 'BUY', shares: 4000, price: 160, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-15', stock: { symbol: 'COST', companyName: 'Costco Wholesale', currentPrice: 750.00, currency: 'USD', dayChangePercent: 1.30, sector: 'Consumer Defensive', country: 'USA' }, transactions: [{ id: 'm15', type: 'BUY', shares: 800, price: 580, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-16', stock: { symbol: 'WMT', companyName: 'Walmart Inc.', currentPrice: 60.00, currency: 'USD', dayChangePercent: 0.45, sector: 'Consumer Defensive', country: 'USA' }, transactions: [{ id: 'm16', type: 'BUY', shares: 12000, price: 52, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-17', stock: { symbol: 'BRK.B', companyName: 'Berkshire Hathaway', currentPrice: 420.00, currency: 'USD', dayChangePercent: 0.15, sector: 'Financial Services', country: 'USA' }, transactions: [{ id: 'm17', type: 'BUY', shares: 2500, price: 360, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-18', stock: { symbol: 'GS', companyName: 'Goldman Sachs Group', currentPrice: 410.00, currency: 'USD', dayChangePercent: 0.90, sector: 'Financial Services', country: 'USA' }, transactions: [{ id: 'm18', type: 'BUY', shares: 1500, price: 350, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-19', stock: { symbol: 'SCHD', companyName: 'Schwab US Dividend', currentPrice: 78.00, currency: 'USD', dayChangePercent: 0.20, sector: 'ETF', country: 'USA' }, transactions: [{ id: 'm19', type: 'BUY', shares: 10000, price: 72, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-20', stock: { symbol: 'JEPI', companyName: 'JPMorgan Equity Premium', currentPrice: 56.00, currency: 'USD', dayChangePercent: 0.10, sector: 'ETF', country: 'USA' }, transactions: [{ id: 'm20', type: 'BUY', shares: 12000, price: 54, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-21', stock: { symbol: 'TLT', companyName: 'iShares 20+ Yr Treasury', currentPrice: 92.00, currency: 'USD', dayChangePercent: -0.50, sector: 'ETF', country: 'USA' }, transactions: [{ id: 'm21', type: 'BUY', shares: 8000, price: 98, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-22', stock: { symbol: 'VNQ', companyName: 'Vanguard Real Estate', currentPrice: 85.00, currency: 'USD', dayChangePercent: 0.35, sector: 'ETF', country: 'USA' }, transactions: [{ id: 'm22', type: 'BUY', shares: 8000, price: 82, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-23', stock: { symbol: 'DBC', companyName: 'Invesco DB Commodity', currentPrice: 23.00, currency: 'USD', dayChangePercent: 1.10, sector: 'ETF', country: 'Global' }, transactions: [{ id: 'm23', type: 'BUY', shares: 25000, price: 21, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-24', stock: { symbol: 'NEE', companyName: 'NextEra Energy Inc.', currentPrice: 65.00, currency: 'USD', dayChangePercent: 0.80, sector: 'Utilities', country: 'USA' }, transactions: [{ id: 'm24', type: 'BUY', shares: 10000, price: 58, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-25', stock: { symbol: 'DUK', companyName: 'Duke Energy Corp', currentPrice: 95.00, currency: 'USD', dayChangePercent: 0.20, sector: 'Utilities', country: 'USA' }, transactions: [{ id: 'm25', type: 'BUY', shares: 6000, price: 92, date: new Date() }], userCurrency: 'USD' },
    { id: 'ma-26', stock: { symbol: 'CASH', companyName: 'Global Cash reserves', currentPrice: 1.00, currency: 'USD', dayChangePercent: 0.00, sector: 'Cash', country: 'USA' }, transactions: [{ id: 'm26', type: 'BUY', shares: 800000, price: 1, date: new Date() }], userCurrency: 'USD' }
  ];

  /* --- PERSISTENCE LOGIC (API) --- */
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from API on mount
  useEffect(() => {
    const loadPortfolios = async () => {
      try {
        const res = await fetch('/api/portfolios', {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          // Update state with API data. If new user, data will be []
          if (Array.isArray(data)) {
            setPortfolios(data);
          }
        }
      } catch (e) {
        console.error("Failed to load from API", e);
      } finally {
        setIsLoaded(true);
      }
    };
    if (isAuthenticated) {
      loadPortfolios();
    } else if (!authLoading) {
      setIsLoaded(true);
    }
  }, [isAuthenticated, authLoading, getAuthHeaders]);

  // Save to API on change (Debounced to avoid flooding)
  useEffect(() => {
    if (!isLoaded || !isAuthenticated) return; // Don't save before initial load or if not authenticated

    const saveToApi = async () => {
      try {
        await fetch('/api/portfolios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(portfolios)
        });
      } catch (e) {
        console.error("Failed to save to API", e);
      }
    };

    const timeoutId = setTimeout(saveToApi, 1000); // Debounce 1s
    return () => clearTimeout(timeoutId);
  }, [portfolios, isLoaded, getAuthHeaders, isAuthenticated]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('institutional');

  const activePortfolio = useMemo(() => {
    if (portfolios.length === 0) return null;
    return portfolios.find(p => p.id === activePortfolioId) || portfolios[0];
  }, [portfolios, activePortfolioId]);

  const [activePositionId, setActivePositionId] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portfolioToDeleteId, setPortfolioToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const refreshPortfolioPrices = async () => {
      setIsRefreshing(true);

      // Safety timeout to ensure spinner doesn't get stuck
      const safetyTimeout = setTimeout(() => setIsRefreshing(false), 8000);

      try {
        const newPortfolios = await Promise.all(portfolios.map(async (p) => {
          const updatedPositions = [...p.positions];
          let changed = false;
          await Promise.all(updatedPositions.map(async (position, index) => {
            try {
              // Add a small random delay to avoid hitting rate limits all at once if valid
              await new Promise(r => setTimeout(r, Math.random() * 1000));
              const data = await fetchStockPrice(position.stock.symbol);
              if (data) {
                updatedPositions[index] = {
                  ...position,
                  stock: { ...position.stock, currentPrice: data.price, dayChangePercent: data.change }
                };
                changed = true;
              }
            } catch (e) {
              console.warn(`Failed to update ${position.stock.symbol}`, e);
            }
          }));
          return changed ? { ...p, positions: updatedPositions } : p;
        }));
        setPortfolios(newPortfolios);
      } catch (err) {
        console.error("Global refresh failed", err);
      } finally {
        clearTimeout(safetyTimeout);
        setIsRefreshing(false);
      }
    };
    refreshPortfolioPrices();
  }, []);

  const { totalValue, totalCost, totalProfit, totalProfitPercent, dayChangeValue } = useMemo(() => {
    if (!activePortfolio) {
      return { totalValue: 0, totalCost: 0, totalProfit: 0, totalProfitPercent: 0, dayChangeValue: 0 };
    }

    let tValue = 0;
    let tCost = 0;
    let dChangeVal = 0;
    const rate = EXCHANGE_RATES[displayCurrency] || 1;

    activePortfolio.positions.forEach(pos => {
      let shares = 0;
      let posCost = 0;
      pos.transactions.forEach(tx => {
        if (tx.type === 'BUY') {
          shares += tx.shares;
          posCost += tx.shares * tx.price;
        } else {
          if (shares > 0) {
            const avgCost = posCost / shares;
            posCost -= tx.shares * avgCost;
            shares -= tx.shares;
          }
        }
      });
      const currentPrice = pos.stock.currentPrice ?? 0;
      const val = shares * currentPrice;
      const dayChangePct = pos.stock.dayChangePercent ?? 0;
      const prevPrice = currentPrice / (1 + (dayChangePct / 100));
      const dailyDiff = (currentPrice - prevPrice) * shares;
      tValue += val * rate;
      tCost += posCost * rate;
      dChangeVal += dailyDiff * rate;
    });
    const tProfit = tValue - tCost;
    const tProfitPct = tCost > 0 ? (tProfit / tCost) * 100 : 0;
    return { totalValue: tValue, totalCost: tCost, totalProfit: tProfit, totalProfitPercent: tProfitPct, dayChangeValue: dChangeVal };
  }, [activePortfolio, displayCurrency]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreatePortfolio = async (name: string, currency?: string, firstStock?: string) => {
    const portfolioId = crypto.randomUUID();
    const newPortfolio: Portfolio = { id: portfolioId, name: name, positions: [] };

    // Add the portfolio first
    setPortfolios(prev => [...prev, newPortfolio]);
    setActivePortfolioId(portfolioId);
    if (currency) setDisplayCurrency(currency);

    // If a first stock was selected in the wizard, add it with 0 shares as a placeholder
    if (firstStock) {
      try {
        const stockData = await fetchStockData(firstStock);
        const newPosition: PortfolioPosition = {
          id: crypto.randomUUID(),
          stock: stockData,
          transactions: [],
          userCurrency: currency || 'USD'
        };
        setPortfolios(prev => prev.map(p => p.id === portfolioId ? { ...p, positions: [newPosition] } : p));
      } catch (e) {
        console.error("Failed to add initial stock", e);
      }
    }
  };

  const handleDeletePortfolio = (id: string) => {
    if (portfolios.length <= 1) return;
    const pf = portfolios.find(p => p.id === id);
    if (!pf) return;

    const newPortfolios = portfolios.filter(p => p.id !== id);
    setPortfolios(newPortfolios);
    if (activePortfolioId === id) setActivePortfolioId(newPortfolios[0].id);
    showToast(language === 'es' ? 'Portafolio eliminado' : 'Portfolio deleted');
  };

  const handleSwitchPortfolio = (id: string) => setActivePortfolioId(id);

  const handleAddStock = async (inputs: StockSearchInputs) => {
    if (!inputs.symbol || !inputs.shares || !inputs.buyPrice) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let stockData = await fetchStockData(inputs.symbol);
      const initialTransaction: Transaction = { id: crypto.randomUUID(), type: 'BUY', shares: parseFloat(inputs.shares), price: parseFloat(inputs.buyPrice), date: new Date() };
      const newPosition: PortfolioPosition = { id: crypto.randomUUID(), stock: stockData, transactions: [initialTransaction], userCurrency: inputs.currency };
      setPortfolios(prev => prev.map(p => p.id === activePortfolioId ? { ...p, positions: [newPosition, ...p.positions] } : p));
      setIsAddModalOpen(false);
      showToast(language === 'es' ? 'Activo añadido correctamente' : 'Asset added successfully');
    } catch (err) {
      setError("Failed to find stock.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = (type: TransactionType, shares: number, price: number) => {
    if (!activePositionId) return;
    const newTransaction: Transaction = { id: crypto.randomUUID(), type, shares, price, date: new Date() };
    setPortfolios(prev => prev.map(p => p.id === activePortfolioId ? { ...p, positions: p.positions.map(pos => pos.id === activePositionId ? { ...pos, transactions: [...pos.transactions, newTransaction] } : pos) } : p));
  };

  const handleDeleteTransaction = (txId: string) => {
    if (!activePositionId) return;
    setPortfolios(prev => prev.map(p => p.id === activePortfolioId ? { ...p, positions: p.positions.map(pos => pos.id === activePositionId ? { ...pos, transactions: pos.transactions.filter(t => t.id !== txId) } : pos) } : p));
  };

  const handleRemovePosition = (id: string) => {
    setPortfolios(prev => prev.map(p => p.id === activePortfolioId ? { ...p, positions: p.positions.filter(pos => pos.id !== id) } : p));
    setActivePositionId(null);
  };

  const handleAnalyzePortfolio = async () => {
    if (!activePortfolio || activePortfolio.positions.length === 0) {
      showToast(language === 'es' ? 'El portafolio está vacío' : 'Portfolio is empty', 'error');
      return;
    }
    setIsAnalysisModalOpen(true);
    setIsAnalyzing(true);
    setAnalysisResult('');
    try {
      let totalValueBase = 0;
      const positionsData = activePortfolio.positions.map(pos => {
        let shares = 0;
        pos.transactions.forEach(tx => { if (tx.type === 'BUY') shares += tx.shares; else shares -= tx.shares; });
        const value = shares * (pos.stock.currentPrice || 0);
        totalValueBase += value;
        return { symbol: pos.stock.symbol, name: pos.stock.companyName, value };
      });
      const portfolioTableString = positionsData.map(p => {
        const weight = totalValueBase > 0 ? ((p.value / totalValueBase) * 100).toFixed(1) : '0';
        let type = 'Acción';
        if (p.symbol.length > 4 || ['SPY', 'QQQ', 'VOO', 'VEA', 'VWO', 'GLD', 'SLV', 'IBIT'].includes(p.symbol)) type = 'ETF';
        if (['BTC', 'ETH', 'SOL'].includes(p.symbol)) type = 'Cripto';
        return `${p.symbol} (${p.name})\t${type}\t${weight}%`;
      }).join('\n');
      const fullDataString = `Activo\tTipo\t% Cartera\n${portfolioTableString}\nTotal cartera: 100%`;
      const result = await analyzePortfolioData(fullDataString);
      setAnalysisResult(result);
    } catch (err: any) {
      console.error("Analysis failed", err);
      if (err.message?.includes('429') || err.message?.includes('Quota') || err.toString().includes('429')) {
        setAnalysisResult("⚠️ **Limit Reached**: The AI usage quota for this key has been exceeded (Error 429). Please try again later or use a different key.");
      } else {
        setAnalysisResult("⚠️ **Analysis Failed**: Could not generate report. Please check your internet connection and API Key.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOpenMarketItem = async (item: any) => {
    try {
      const stockData = await fetchStockData(item.symbol || item.name);
      setSelectedStock(stockData);
    } catch (e) {
      setSelectedStock({ symbol: item.symbol || item.name.substring(0, 4).toUpperCase(), companyName: item.name, currentPrice: parseFloat(item.value.replace(/,/g, '')), currency: 'USD', dayChangePercent: item.change, description: `Market data for ${item.name}.` });
    }
  };

  // Auth handlers are now managed by AuthContext - kept for legacy compatibility
  const handleLogin = () => { };
  const handleLogout = () => { };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(portfolios));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "stoxy_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files.length > 0) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          if (event.target?.result) {
            const parsedData = JSON.parse(event.target.result as string);
            if (Array.isArray(parsedData)) {
              if (parsedData.length > 0 && 'positions' in parsedData[0]) {
                setPortfolios(parsedData);
                setActivePortfolioId(parsedData[0].id);
              } else {
                setPortfolios([{ id: 'imported', name: 'Imported Portfolio', positions: parsedData }]);
                setActivePortfolioId('imported');
              }
              setIsSettingsOpen(false);
            }
          }
        } catch (err) { }
      };
    }
  };

  const currentActivePosition = activePortfolio?.positions.find(p => p.id === activePositionId);
  const getCurrencySymbol = (code: string) => {
    if (code === 'EUR') return '€';
    if (code === 'GBP') return '£';
    if (code === 'JPY') return '¥';
    return '$';
  };

  const t = (en: string, es: string) => language === 'es' ? es : en;

  if (authLoading) {
    return (
      <div className={`${theme} min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black`}>
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-blue-500" size={48} />
          <p className="text-sm font-bold text-gray-500 dark:text-zinc-500 animate-pulse">Initializing Ecosystem...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={`${theme} min-h-screen font-sans selection:bg-blue-500/30 relative bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300`}>
        <LandingView language={language} theme={theme} />
      </div>
    );
  }

  return (
    <div className={`${theme} min-h-screen font-sans selection:bg-blue-500/30 relative bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-300`}>
      <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-blue-100/50 via-gray-50 to-gray-50 dark:from-[#1a1a40] dark:via-black dark:to-black opacity-60 z-0 pointer-events-none" />
      <main className="relative z-10 max-w-lg mx-auto md:max-w-3xl lg:max-w-4xl min-h-screen">
        {isRefreshing && (
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-white/80 dark:bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-200 dark:border-zinc-800 animate-in fade-in shadow-sm">
            <RefreshCw className="animate-spin text-blue-500" size={14} />
            <span className="text-xs font-bold text-gray-600 dark:text-zinc-300">Syncing Prices...</span>
          </div>
        )}
        {toast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#1C1C1E] border border-zinc-800 shadow-2xl animate-in slide-in-from-top-4 duration-200">
            {toast.type === 'error' ? (
              <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center shrink-0"><AlertTriangle size={18} /></div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center shrink-0"><CheckCircle2 size={18} /></div>
            )}
            <div>
              <h4 className={`font-bold text-sm ${toast.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{toast.type === 'error' ? 'Error' : 'Success'}</h4>
              <p className="text-zinc-400 text-xs font-medium">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="ml-2 text-zinc-500 hover:text-white"><XCircle size={16} /></button>
          </div>
        )}
        {activeTab === 'portfolio' && (
          <PortfolioView
            portfolios={portfolios}
            activePortfolioId={activePortfolioId}
            onSwitchPortfolio={handleSwitchPortfolio}
            onCreatePortfolio={handleCreatePortfolio}
            onDeletePortfolio={handleDeletePortfolio}
            portfolio={activePortfolio?.positions || []}
            totalValue={totalValue}
            totalProfit={totalProfit}
            totalProfitPercent={totalProfitPercent}
            dayChangeValue={dayChangeValue}
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenTransactions={(id) => setActivePositionId(id)}
            onRemovePosition={handleRemovePosition}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSelectStock={(stock) => setSelectedStock(stock)}
            onAnalyzePortfolio={handleAnalyzePortfolio}
            language={language}
            currentCurrency={displayCurrency}
            onCurrencyChange={setDisplayCurrency}
            exchangeRate={EXCHANGE_RATES[displayCurrency] || 1}
            onOpenDeleteConfirmation={setPortfolioToDeleteId}
          />
        )}
        {activeTab === 'markets' && <MarketsView portfolio={activePortfolio?.positions || []} onSelectMarketItem={handleOpenMarketItem} />}
        {activeTab === 'calendar' && <CalendarView portfolio={activePortfolio?.positions || []} />}
        {activeTab === 'news' && <NewsView />}
        {activeTab === 'charts' && <ChartsView portfolio={activePortfolio?.positions || []} />}
      </main>
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-xl border-t border-gray-200 dark:border-zinc-800/50 pb-safe pt-2 px-2 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-lg mx-auto flex justify-around items-end pb-2">
          <button onClick={() => setActiveTab('portfolio')} className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 ${activeTab === 'portfolio' ? 'text-blue-600 dark:text-blue-500 -translate-y-2' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'}`}>
            <div className={`p-1 ${activeTab === 'portfolio' && 'bg-blue-100 dark:bg-blue-500/20 rounded-xl'}`}><Wallet size={24} strokeWidth={activeTab === 'portfolio' ? 2.5 : 2} /></div>
            <span className={`text-xs font-bold ${activeTab === 'portfolio' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{t('Portfolio', 'Portafolio')}</span>
          </button>
          <button onClick={() => setActiveTab('markets')} className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 ${activeTab === 'markets' ? 'text-blue-600 dark:text-blue-500 -translate-y-2' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'}`}>
            <div className={`p-1 ${activeTab === 'markets' && 'bg-blue-100 dark:bg-blue-500/20 rounded-xl'}`}><BarChart2 size={24} strokeWidth={activeTab === 'markets' ? 2.5 : 2} /></div>
            <span className={`text-xs font-bold ${activeTab === 'markets' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{t('Markets', 'Mercados')}</span>
          </button>
          <button onClick={() => setActiveTab('charts')} className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 ${activeTab === 'charts' ? 'text-blue-600 dark:text-blue-500 -translate-y-2' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'}`}>
            <div className={`p-1 ${activeTab === 'charts' && 'bg-blue-100 dark:bg-blue-500/20 rounded-xl'}`}><PieChart size={24} strokeWidth={activeTab === 'charts' ? 2.5 : 2} /></div>
            <span className={`text-xs font-bold ${activeTab === 'charts' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{t('Charts', 'Gráficos')}</span>
          </button>
          <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 ${activeTab === 'calendar' ? 'text-blue-600 dark:text-blue-500 -translate-y-2' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'}`}>
            <div className={`p-1 ${activeTab === 'calendar' && 'bg-blue-100 dark:bg-blue-500/20 rounded-xl'}`}><Calendar size={24} strokeWidth={activeTab === 'calendar' ? 2.5 : 2} /></div>
            <span className={`text-xs font-bold ${activeTab === 'calendar' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{t('Calendar', 'Calendario')}</span>
          </button>
          <button onClick={() => setActiveTab('news')} className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 ${activeTab === 'news' ? 'text-blue-600 dark:text-blue-500 -translate-y-2' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'}`}>
            <div className={`p-1 ${activeTab === 'news' && 'bg-blue-100 dark:bg-blue-500/20 rounded-xl'}`}><Newspaper size={24} strokeWidth={activeTab === 'news' ? 2.5 : 2} /></div>
            <span className={`text-xs font-bold ${activeTab === 'news' ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{t('News', 'Noticias')}</span>
          </button>
        </div>
      </div>
      <AddStockModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddStock} loading={loading} error={error} />
      <SettingsView
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onExport={handleExportData}
        onImport={handleImportData}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        onDeleteActivePortfolio={() => {
          if (portfolios.length > 1 && activePortfolioId) {
            setPortfolioToDeleteId(activePortfolioId);
          } else if (portfolios.length <= 1) {
            showToast(t('Cannot delete only portfolio', 'No se puede borrar la única cartera'), 'error');
          }
        }}
      />
      {currentActivePosition && <TransactionModal isOpen={!!activePositionId} onClose={() => setActivePositionId(null)} transactions={currentActivePosition.transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} currencySymbol={getCurrencySymbol(currentActivePosition.userCurrency)} currentPrice={currentActivePosition.stock.currentPrice} />}
      {selectedStock && <StockDetailView stock={selectedStock} onClose={() => setSelectedStock(null)} language={language} />}
      <PortfolioAnalysisModal isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} analysisText={analysisResult} isAnalyzing={isAnalyzing} />

      {/* Reusable Portfolio Delete Confirmation Modal */}
      {portfolioToDeleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-zinc-800 rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{t('Delete Portfolio', 'Borrar Cartera')}</h3>
            <p className="text-gray-500 dark:text-zinc-400 mb-8 font-medium">
              {t('Are you sure? All assets in this portfolio will be removed. This action is permanent.', '¿Estás seguro? Todos los activos en esta cartera serán eliminados. Esta acción es permanente.')}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPortfolioToDeleteId(null)} className="flex-1 px-4 py-4 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors">
                {t('Cancel', 'Cancelar')}
              </button>
              <button
                onClick={() => {
                  handleDeletePortfolio(portfolioToDeleteId);
                  setPortfolioToDeleteId(null);
                  setIsSettingsOpen(false);
                }}
                className="flex-1 px-4 py-4 rounded-2xl bg-red-600 text-white font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                {t('Delete', 'Borrar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main App wrapper with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;