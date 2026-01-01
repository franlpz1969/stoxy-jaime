
export interface StockData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  currency: string;
  dayChangePercent: number;
  logoUrl?: string;
  marketStatus?: 'open' | 'closed';
  description?: string;
  sector?: string;
  country?: string;
  marketCap?: number;
  peRatio?: number;
  eps?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  volume?: string;
  avgVolume?: string;
  openPrice?: number;
  previousClose?: number;
  dayHigh?: number;
  dayLow?: number;
  enterpriseValue?: number;
  trailingPE?: number;
  forwardPE?: number;
  pegRatio?: number;
  priceToSales?: number;
  priceToBook?: number;
  enterpriseValueToRevenue?: number;
  enterpriseValueToEbitda?: number;
  profitMargin?: number;
  operatingMargin?: number;
  returnOnAssets?: number;
  returnOnEquity?: number;
  revenueTTM?: number;
  revenuePerShare?: number;
  quarterlyRevenueGrowth?: number;
  grossProfit?: number;
  ebitda?: number;
  dilutedEpsTTM?: number;
  totalCash?: number;
  totalCashPerShare?: number;
  totalDebt?: number;
  totalDebtToEquity?: number;
  currentRatio?: number;
  bookValuePerShare?: number;
  operatingCashFlow?: number;
  leveredFreeCashFlow?: number;
  beta?: number;
  sharesOutstanding?: number;
  floatShares?: number;
  heldByInsiders?: number;
  heldByInstitutions?: number;
  dividendYield?: number;
  dividendRate?: number;
  payoutRatio?: number;
  dividendDate?: string;
  exDividendDate?: string;
  analystRating?: number;
  priceTarget?: { low: number; high: number; average: number };
  recommendationTrend?: RecommendationTrend[];
  exchange?: string;
}

export interface RecommendationTrend {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface InvestmentRecommendation {
  ticker: string;
  companyName: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  suggestedBuyPrice: number;
  targetPrice: number;
  asOfDate: string;
  metrics: {
    pe: string;
    peg: string;
    roe: string;
    debtToEquity: string;
  };
  fundamentalThesis: string;
  technicalAnalysis: string;
  sectorTrends: string;
  companyCatalysts: string;
  valuationRadar?: {
    marginMM1000: string;
    peStatus: string;
  };
  historicalMatch?: {
    matchedCompany: string;
    matchedDate: string;
    contextSimilarity: string;
    justification: string;
  };
  sourceUrls?: string[];
  logoUrl?: string;
}

export interface EstimateRow {
  period: string;
  analysts: number;
  avg: number;
  low: number;
  high: number;
  yearAgo: number;
  growth?: number;
}

export interface EarningsHistory {
  date: string;
  period: string;
  estimate: number;
  actual: number;
  surprise: number;
}

export interface AnalysisData {
  priceTarget?: { low: number; high: number; average: number };
  recommendationTrend?: RecommendationTrend[];
  earningsEstimate?: EstimateRow[];
  revenueEstimate?: EstimateRow[];
  earningsHistory?: EarningsHistory[];
  revenueVsEarnings?: { period: string; revenue: number; earnings: number }[];
  analystRating?: number;
}

export type TransactionType = 'BUY' | 'SELL';

export interface Transaction {
  id: string;
  type: TransactionType;
  shares: number;
  price: number;
  date: Date;
}

export interface PortfolioPosition {
  id: string;
  stock: StockData;
  transactions: Transaction[];
  userCurrency: string;
}

export interface Portfolio {
  id: string;
  name: string;
  positions: PortfolioPosition[];
}

export interface StockSearchInputs {
  symbol: string;
  shares: string;
  buyPrice: string;
  currency: string;
}
