
import { GoogleGenAI, Type } from "@google/genai";
import { StockData, RecommendationTrend, AnalysisData, EstimateRow, EarningsHistory, InvestmentRecommendation } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getRaw = (obj: any) => {
  if (obj && typeof obj === 'object') {
    if ('raw' in obj) return obj.raw;
    if (Object.keys(obj).length === 0) return undefined;
  }
  return obj;
};

const fetchYahoo = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const encodedUrl = encodeURIComponent(url);
    const res = await fetch(`https://api.allorigins.win/raw?url=${encodedUrl}&timestamp=${Date.now()}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error("API Offline");
    return await res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export const fetchInvestmentRecommendations = async (): Promise<InvestmentRecommendation[]> => {
  try {
    const prompt = `
      Actúa como un Analista Senior de Valor. Tu objetivo es encontrar "Oportunidades de Compra Inmediata" (Buy Now) ÚNICAMENTE dentro del siguiente universo de inversión permitido.
      
      UNIVERSO PERMITIDO (RESTRICCIÓN ESTRICTA):
      - Fondos Indexados: Vanguard Global Stock Index Fund Eur Acc, Vanguard Emerging Markets Stock Index Fund Eur Acc, Vanguard Global Small-cap Index Fund Eur Acc.
      - Cripto: BTC.
      - Acciones: Alphabet Inc Cl C, Lvmh Moet Hennessy Louis V., Georgia Capital Plc, Novo Nord Br/rg-b, Asml Holding Nv, Starbucks Corp, Coca Cola, Pepsico Inc, Mondelez Intl Inc, Johnson And Johnson, Advanced Micro Devices, Adobe Systems Inc, Target Corporation, General Mills Inc, Waste Management, Wisdomtree Physical Gold, Tesla Motors Inc, Lockheed Martin, Amazon, British American Tobacco, Visa Inc Class A, Petroleo Brasileiro Adr, Microsoft Corp, Canadian Natl Railway Co, Phillip Morris International I, Paypal Holdings Inc, Booking Holdings Inc, Vici Properties Inc, Procter And Gamble, Meta Platform, Mastercard Inc.

      ESTRATEGIA DE FILTRADO:
      - De esta lista, elige de 1 a 4 activos que estén actualmente INFRAVALORADOS, en SOPORTE TÉCNICO, o con un CATALIZADOR positivo inminente.
      - Ignora los activos de la lista que estén en máximos históricos sin margen de seguridad. Queremos "Oportunidades", no solo nombres famosos.

      REQUISITOS DEL ANÁLISIS:
      1. ANÁLISIS FUNDAMENTAL: Detalla el Moat y ratios vs media histórica.
      2. ANÁLISIS TÉCNICO: Soporte, resistencia y por qué es buen punto de entrada hoy.
      3. TENDENCIA DEL SECTOR: Contexto actual.
      4. CATALIZADORES: Eventos próximos (3-6 meses).

      ENTREGABLES (JSON):
      - ticker (o nombre del fondo), companyName, riskLevel, suggestedBuyPrice, targetPrice, metrics, fundamentalThesis, technicalAnalysis, sectorTrends, companyCatalysts.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ticker: { type: Type.STRING },
              companyName: { type: Type.STRING },
              suggestedBuyPrice: { type: Type.NUMBER },
              targetPrice: { type: Type.NUMBER },
              asOfDate: { type: Type.STRING },
              riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
              metrics: {
                type: Type.OBJECT,
                properties: {
                  pe: { type: Type.STRING },
                  peg: { type: Type.STRING },
                  roe: { type: Type.STRING },
                  debtToEquity: { type: Type.STRING }
                },
                required: ['pe', 'peg', 'roe', 'debtToEquity']
              },
              fundamentalThesis: { type: Type.STRING },
              technicalAnalysis: { type: Type.STRING },
              sectorTrends: { type: Type.STRING },
              companyCatalysts: { type: Type.STRING }
            },
            required: ['ticker', 'companyName', 'suggestedBuyPrice', 'targetPrice', 'asOfDate', 'riskLevel', 'metrics', 'fundamentalThesis', 'technicalAnalysis', 'sectorTrends', 'companyCatalysts']
          }
        }
      }
    });

    const recommendations = JSON.parse(response.text);
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourceUrls = chunks.map((c: any) => c.web?.uri).filter(Boolean);

    return recommendations.map((rec: any) => ({
      ...rec,
      sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined
    }));
  } catch (error) {
    console.error("Failed to fetch detailed recommendations:", error);
    return [];
  }
};

export const generateMockStockData = (symbol: string): StockData => {
  const s = symbol.toUpperCase();
  const seed = s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand = (mod: number) => (seed * mod) % 100;

  let price = (seed % 400) + 50;
  let mktCap = 50e9;

  if (['MSFT', 'AAPL', 'NVDA'].includes(s)) {
    price = s === 'MSFT' ? 425 : (s === 'AAPL' ? 228 : 130);
    mktCap = 3.2e12;
  } else if (['GOOGL', 'AMZN', 'META'].includes(s)) {
    price = s === 'GOOGL' ? 170 : (s === 'AMZN' ? 185 : 500);
    mktCap = 2.0e12;
  }

  return {
    symbol: s,
    companyName: `${s} Corp`,
    currentPrice: price,
    currency: 'USD',
    dayChangePercent: (seed % 6) - 2,
    description: "Sincronizando perfil corporativo institucional...",
    logoUrl: `https://logo.clearbit.com/${s.toLowerCase()}.com`,
    marketCap: mktCap,
    enterpriseValue: mktCap * 1.05,
    trailingPE: 30 + (rand(10) / 2),
    forwardPE: 28 + (rand(8) / 2),
    pegRatio: 1.2,
    priceToSales: 8.5,
    priceToBook: 12.4,
    enterpriseValueToRevenue: 9.1,
    enterpriseValueToEbitda: 18.5,
    volume: '25M'
  };
};

export const fetchStockData = async (query: string): Promise<StockData> => {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${query}?modules=price,summaryDetail,summaryProfile,defaultKeyStatistics,financialData,recommendationTrend`;
    const res = await fetchYahoo(url);
    const r = res.quoteSummary?.result?.[0];
    if (!r) return generateMockStockData(query);

    const base = generateMockStockData(query);
    const p = r.price || {};
    const sd = r.summaryDetail || {};
    const ks = r.defaultKeyStatistics || {};
    const fd = r.financialData || {};

    return {
      ...base,
      companyName: getRaw(p.longName) || getRaw(p.shortName) || base.companyName,
      currentPrice: getRaw(p.regularMarketPrice) || base.currentPrice,
      currency: getRaw(p.currency) || 'USD',
      dayChangePercent: (getRaw(p.regularMarketChangePercent) * 100) || base.dayChangePercent,
      marketCap: getRaw(p.marketCap) || getRaw(sd.marketCap) || base.marketCap,
      enterpriseValue: getRaw(ks.enterpriseValue) || base.enterpriseValue,
      trailingPE: getRaw(sd.trailingPE) || getRaw(fd.trailingPE) || base.trailingPE,
      forwardPE: getRaw(sd.forwardPE) || getRaw(ks.forwardPE) || base.forwardPE,
      pegRatio: getRaw(ks.pegRatio) || base.pegRatio,
      priceToSales: getRaw(sd.priceToSalesTrailing12Months) || base.priceToSales,
      priceToBook: getRaw(ks.priceToBook) || base.priceToBook,
      enterpriseValueToRevenue: getRaw(ks.enterpriseValueToRevenue) || base.enterpriseValueToRevenue,
      enterpriseValueToEbitda: getRaw(ks.enterpriseValueToEbitda) || base.enterpriseValueToEbitda,
      description: getRaw(r.summaryProfile?.longBusinessSummary) || base.description,
      logoUrl: `https://logo.clearbit.com/${getRaw(r.summaryProfile?.website)?.replace(/^https?:\/\//, '') || query + '.com'}`
    };
  } catch (e) {
    return generateMockStockData(query);
  }
};

export const fetchStockHistory = async (symbol: string, range: string) => {
  try {
    let r = '1mo', i = '1d';
    if (range === '1D') { r = '1d'; i = '5m'; }
    else if (range === '5D') { r = '5d'; i = '15m'; }
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${r}&interval=${i}`;
    const data = await fetchYahoo(url);
    const res = data.chart?.result?.[0];
    if (!res) return [];
    const t = res.timestamp || [];
    const c = res.indicators?.quote?.[0]?.close || [];
    return t.map((time: number, idx: number) => ({ timestamp: time * 1000, price: c[idx] })).filter((d: any) => d.price);
  } catch (e) { return []; }
};

export const fetchAnalysisData = async (symbol: string): Promise<AnalysisData | null> => {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=earningsEstimate,recommendationTrend,financialData,revenueEstimate`;
    const res = await fetchYahoo(url);
    const r = res.quoteSummary?.result?.[0];
    if (!r) throw new Error("Fail");

    return {
      priceTarget: {
        low: getRaw(r.financialData?.targetLowPrice) || 0,
        high: getRaw(r.financialData?.targetHighPrice) || 0,
        average: getRaw(r.financialData?.targetMeanPrice) || 0
      },
      recommendationTrend: r.recommendationTrend?.trend?.map((t: any) => ({
        period: t.period, strongBuy: t.strongBuy, buy: t.buy, hold: t.hold, sell: t.sell, strongSell: t.strongSell
      })).slice(0, 5),
      analystRating: getRaw(r.financialData?.recommendationMean)
    };
  } catch (e) {
    const mock = generateMockStockData(symbol);
    return {
      priceTarget: { low: mock.currentPrice * 0.8, high: mock.currentPrice * 1.3, average: mock.currentPrice * 1.15 },
      recommendationTrend: [{ period: '0m', strongBuy: 15, buy: 20, hold: 5, sell: 1, strongSell: 0 }],
      analystRating: 1.7
    };
  }
};

export const fetchStockPrice = async (symbol: string) => {
  try {
    const d = await fetchStockHistory(symbol, '1D');
    if (d.length > 0) {
      const last = d[d.length - 1];
      const first = d[0];
      return { price: last.price, change: ((last.price - first.price) / first.price) * 100 };
    }
  } catch (e) { }
  return null;
};

export const fetchMarketSentiment = async () => {
  try {
    const r = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: 'Return JSON { "score": number, "label": "string" } for CNN Fear and Greed Index.',
    });
    return JSON.parse(r.text.replace(/```json|```/g, ''));
  } catch (e) { return { score: 55, label: 'Neutral' }; }
};

export const searchSymbols = async (q: string) => {
  try {
    const data = await fetchYahoo(`https://query1.finance.yahoo.com/v1/finance/search?q=${q}`);
    return (data.quotes || []).map((i: any) => ({ symbol: i.symbol, description: i.shortname || i.symbol, type: i.quoteType, exchange: i.exchange }));
  } catch (e) { return []; }
};

export const analyzePortfolioData = async (data: string) => {
  const r = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Analiza esta cartera:\n${data}\nResponde en Markdown fluido.`,
  });
  return r.text;
};
