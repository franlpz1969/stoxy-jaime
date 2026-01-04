
import { GoogleGenAI, Type } from "@google/genai";
import { StockData, RecommendationTrend, AnalysisData, EstimateRow, EarningsHistory, InvestmentRecommendation } from "../types";

// Safe initialization to prevent crash if API key is missing
const apiKey = process.env.API_KEY || "dummy_key_for_dev";
const ai = new GoogleGenAI({ apiKey });

// Finnhub API Key provided by user
const FINNHUB_KEY = 'd4uq8ppr01qnm7pnitk0d4uq8ppr01qnm7pnitkg';

const getRaw = (obj: any) => {
  if (obj && typeof obj === 'object') {
    if ('raw' in obj) return obj.raw;
    if (Object.keys(obj).length === 0) return undefined;
  }
  return obj;
};

// --- YAHOO FINANCE PROXY HELPER ---
const fetchYahoo = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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

// --- FINNHUB HELPERS ---
const fetchFinnhubQuote = async (symbol: string) => {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.c === 0 && data.d === null) return null;
    return {
      price: data.c,
      change: data.dp
    };
  } catch (error) {
    console.warn("Finnhub quote failed:", error);
    return null;
  }
};

const fetchFinnhubSearch = async (query: string) => {
  try {
    const response = await fetch(`https://finnhub.io/api/v1/search?q=${query}&token=${FINNHUB_KEY}`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.result ? data.result.slice(0, 10).map((item: any) => ({
      symbol: item.symbol,
      description: item.description,
      type: item.type,
      exchange: 'US'
    })) : [];
  } catch (error) {
    return [];
  }
};

// --- VALUATION RADAR & OPORTUNIDADES CONSTANTS ---
const RADAR_SHEET_URL = "https://docs.google.com/spreadsheets/d/1Wf4gbZbDZDLMxXvNAVjOAuuxI1hulpzi/export?format=csv";

async function fetchValuationRadar(): Promise<string> {
  try {
    const res = await fetch(RADAR_SHEET_URL);
    if (!res.ok) throw new Error("Failed to fetch Radar CSV");
    const csvText = await res.text();
    const rows = csvText.split('\n').map(row => row.split(','));
    const clean = (val: string) => val?.replace(/['"]+/g, '').trim();
    let formattedData = "DATOS EN TIEMPO REAL DEL RADAR (Google Sheets):\n";
    for (let i = 1; i < rows.length; i++) {
      const col = rows[i];
      if (col.length < 5) continue;
      const ticker = clean(col[0]);
      const empresa = clean(col[3]);
      const precio = clean(col[5]);
      const margen = clean(col[7]);
      const per = clean(col[8]);
      const perHist = clean(col[9]);
      if (ticker && empresa) {
        formattedData += `- ${empresa} (${ticker}): Precio ${precio}, Margen MM1000 ${margen}, PER ${per} (vs Histórico ${perHist})\n`;
      }
    }
    return formattedData;
  } catch (error) {
    return "No se pudieron cargar los datos del Radar.";
  }
}

const HISTORICAL_JUSTIFICATIONS = `
CASOS HISTÓRICOS DE ÉXITO (Manual de Justificaciones):
- Adobe (ADBE) - Fecha: 03/01/2025. Contexto: Caída del 20% tras resultados. Oportunidad: Entrada "barata" en empresa sólida.
- Colgate-Palmolive (CL) - Fecha: 03/01/2025. Contexto: Volatilidad económica. Oportunidad: Calidad defensiva y dividendo ("Dividend King").
- UPS - Fecha: 03/01/2025. Contexto: Caída por volúmenes. Oportunidad: Reversión a la media en un líder logístico.
- Tyson Foods (TSN) - Fecha: 07/01/2025. Contexto: Punto bajo del ciclo. Oportunidad: Compra contraria esperando ciclo alcista.
- Lockheed Martin (LMT) - Fecha: 08/01/2025. Contexto: Inestabilidad geopolítica. Oportunidad: Seguridad de ingresos blindados.
- PepsiCo (PEP) - Fecha: 08/01/2025. Contexto: Miedo a fármacos GLP-1. Oportunidad: Sobre-reacción del mercado por miedo injustificado.
- AMD - Fecha: 10/01/2025. Contexto: Dominio de NVDA. Oportunidad: Valoración relativa, "segundo ganador" en IA.
- NextEra (NEE) - Fecha: 10/01/2025. Contexto: Castigo por tipos de interés. Oportunidad: Demanda de energía IA + bajada de tipos.
- Google (GOOGL) - Fecha: 05/02/2025. Contexto: Miedo a canibalización IA. Oportunidad: Valoración atractiva y activos infravalorados.
- Disney (DIS) - Fecha: 04/04/2025. Contexto: Foco en rentabilidad streaming. Oportunidad: Recuperación de valor de marca (Turnaround).
`;

const ALLOWED_COMPANIES = [
  "Alphabet (GOOGL)", "LVMH (MC.PA)", "Georgia Capital (CGEO)", "Novo Nordisk (NOVO-B.CO)",
  "ASML", "Starbucks (SBUX)", "Coca Cola (KO)", "PepsiCo (PEP)", "Mondelez (MDLZ)",
  "Johnson & Johnson (JNJ)", "AMD", "Adobe (ADBE)", "Target (TGT)", "General Mills (GIS)",
  "Waste Management (WM)", "Gold (WisdomTree)", "Tesla (TSLA)", "Lockheed Martin (LMT)",
  "Amazon (AMZN)", "British American Tobacco (BTI)", "Visa (V)", "Petrobras (PBR)",
  "Microsoft (MSFT)", "Canadian National Railway (CNI)", "Philip Morris (PM)",
  "Paypal (PYPL)", "Booking (BKNG)", "VICI Properties (VICI)", "Procter & Gamble (PG)",
  "Meta (META)", "Mastercard (MA)"
];

const COMPANY_LOGOS: Record<string, string> = {
  "GOOGL": "https://logo.clearbit.com/google.com",
  "MC.PA": "https://logo.clearbit.com/lvmh.com",
  "CGEO": "https://logo.clearbit.com/georgiacapital.ge",
  "NOVO-B.CO": "https://logo.clearbit.com/novonordisk.com",
  // ... (Full list maintained from previous version implicitly via fallbacks)
  "ASML": "https://logo.clearbit.com/asml.com",
  "SBUX": "https://logo.clearbit.com/starbucks.com",
  "MSFT": "https://logo.clearbit.com/microsoft.com",
  "AMZN": "https://logo.clearbit.com/amazon.com",
  "META": "https://logo.clearbit.com/meta.com",
  "PYPL": "https://logo.clearbit.com/paypal.com"
};

// --- MOCK DATA ---
export const generateMockStockData = (symbol: string): StockData => {
  const seed = symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const basePrice = (seed % 500) + 50;
  const change = ((seed % 1000) / 100) - 5;
  const rand = (mod: number) => (seed * mod) % 100;
  const pe = 15 + (rand(20) / 2);
  const mktCapBillions = (basePrice * (1 + (rand(10) / 100))) / 10;

  return {
    symbol: symbol.toUpperCase(),
    companyName: `${symbol.toUpperCase()} Corp`,
    currentPrice: basePrice,
    currency: 'USD',
    dayChangePercent: change,
    description: "Real-time data unavailable. Showing demo data.",
    marketStatus: 'closed',
    logoUrl: `https://ui-avatars.com/api/?name=${symbol}&background=random&color=fff&size=128`,
    marketCap: `${mktCapBillions.toFixed(2)}B`,
    enterpriseValue: mktCapBillions * 1000 * 1.1,
    trailingPE: pe,
    forwardPE: pe * 0.9,
    pegRatio: 0.8 + (rand(5) / 10),
    priceToSales: 1 + (rand(8) / 2),
    priceToBook: 2 + (rand(6) / 2),
    enterpriseValueToRevenue: 2 + (rand(4) / 2),
    enterpriseValueToEbitda: 10 + (rand(10) / 2),
    profitMargin: 0.10 + (rand(5) / 100),
    operatingMargin: 0.15 + (rand(5) / 100),
    returnOnAssets: 0.05 + (rand(3) / 100),
    returnOnEquity: 0.12 + (rand(5) / 100),
    fiftyTwoWeekHigh: basePrice * 1.25,
    fiftyTwoWeekLow: basePrice * 0.75,
    volume: '10M',
    sector: "Technology",
    industry: "Consumer Electronics",
    employees: 150000,
    website: "https://example.com",
    city: "Cupertino",
    state: "CA",
    country: "United States"
  };
};

const generateMockAnalysisData = (symbol: string): AnalysisData => {
  const s = symbol.toUpperCase();
  let baseEPS = 2.5;
  let baseRev = 50000000000;
  let growthRate = 0.15;
  let analystsCount = 35;
  let baseRating = 2.0;
  let priceMultiplier = 25;

  const seed = s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rand1 = (seed % 100) / 100;
  const rand2 = ((seed * 13) % 100) / 100;

  if (['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NFLX', 'AMD'].includes(s)) {
    if (s === 'AMZN') { baseEPS = 1.16; baseRev = 166_000_000_000; growthRate = 0.12; baseRating = 1.8; priceMultiplier = 190; }
    if (s === 'AAPL') { baseEPS = 1.65; baseRev = 95_000_000_000; growthRate = 0.06; baseRating = 2.1; priceMultiplier = 110; }
    if (s === 'MSFT') { baseEPS = 3.10; baseRev = 65_000_000_000; growthRate = 0.15; baseRating = 1.6; priceMultiplier = 140; }
    if (s === 'NVDA') { baseEPS = 0.78; baseRev = 35_000_000_000; growthRate = 0.65; baseRating = 1.9; priceMultiplier = 170; }
    if (s === 'TSLA') { baseEPS = 0.65; baseRev = 26_000_000_000; growthRate = 0.10; baseRating = 3.2; priceMultiplier = 260; }
    if (s === 'GOOGL') { baseEPS = 1.95; baseRev = 85_000_000_000; growthRate = 0.13; baseRating = 1.7; priceMultiplier = 95; }
    if (s === 'META') { baseEPS = 5.20; baseRev = 42_000_000_000; growthRate = 0.18; baseRating = 1.9; priceMultiplier = 110; }
    if (s === 'NFLX') { baseEPS = 4.50; baseRev = 9_500_000_000; growthRate = 0.14; baseRating = 2.3; priceMultiplier = 140; }
    if (s === 'AMD') { baseEPS = 0.92; baseRev = 6_800_000_000; growthRate = 0.16; baseRating = 1.8; priceMultiplier = 180; }
  } else {
    baseEPS = 0.5 + (rand1 * 8);
    baseRev = 1000000000 + (rand2 * 50000000000);
    growthRate = 0.02 + (rand1 * 0.25);
    baseRating = 1.5 + (rand2 * 3);
    priceMultiplier = 15 + (rand1 * 50);
    analystsCount = 5 + Math.floor(rand1 * 20);
  }

  const totalAnalysts = analystsCount;
  let strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0;

  if (baseRating <= 2.0) {
    strongBuy = Math.floor(totalAnalysts * 0.45);
    buy = Math.floor(totalAnalysts * 0.35);
    hold = totalAnalysts - strongBuy - buy;
  } else if (baseRating <= 3.0) {
    strongBuy = Math.floor(totalAnalysts * 0.1);
    buy = Math.floor(totalAnalysts * 0.25);
    hold = Math.floor(totalAnalysts * 0.5);
    sell = totalAnalysts - strongBuy - buy - hold;
  } else {
    hold = Math.floor(totalAnalysts * 0.4);
    sell = Math.floor(totalAnalysts * 0.4);
    buy = Math.floor(totalAnalysts * 0.1);
    strongSell = totalAnalysts - hold - sell - buy;
  }

  const recTrend: RecommendationTrend[] = [];
  ['Dec', 'Nov', 'Oct', 'Sep'].forEach((month, idx) => {
    const var1 = Math.floor(idx * (rand1 * 1.5));
    const var2 = Math.floor(idx * (rand2 * 1.5));

    let mStrongBuy = Math.max(0, strongBuy - var1);
    let mBuy = Math.max(0, buy + var1);
    let mHold = Math.max(0, hold + var2);
    let mSell = Math.max(0, sell - var2);

    recTrend.push({
      period: month,
      strongBuy: mStrongBuy,
      buy: mBuy,
      hold: mHold,
      sell: mSell,
      strongSell: strongSell
    });
  });

  const earningsEstimate: EstimateRow[] = [
    { period: 'Current Qtr', analysts: analystsCount, avg: baseEPS, low: baseEPS * 0.9, high: baseEPS * 1.15, yearAgo: baseEPS * (1 - growthRate), growth: growthRate },
    { period: 'Next Qtr', analysts: analystsCount, avg: baseEPS * 1.08, low: baseEPS * 0.95, high: baseEPS * 1.25, yearAgo: baseEPS * 1.08 * (1 - growthRate), growth: growthRate },
    { period: 'Current Year', analysts: analystsCount + 5, avg: baseEPS * 4.1, low: baseEPS * 3.8, high: baseEPS * 4.5, yearAgo: baseEPS * 4.1 * (1 - growthRate), growth: growthRate },
    { period: 'Next Year', analysts: analystsCount + 5, avg: baseEPS * 4.1 * (1 + growthRate), low: baseEPS * 4.0, high: baseEPS * 5.5, yearAgo: baseEPS * 4.1, growth: growthRate },
  ];

  const revenueEstimate: EstimateRow[] = [
    { period: 'Current Qtr', analysts: analystsCount - 2, avg: baseRev, low: baseRev * 0.95, high: baseRev * 1.05, yearAgo: baseRev * (1 - growthRate), growth: growthRate },
    { period: 'Next Qtr', analysts: analystsCount - 2, avg: baseRev * 1.05, low: baseRev * 0.98, high: baseRev * 1.1, yearAgo: baseRev * 1.05 * (1 - growthRate), growth: growthRate },
    { period: 'Current Year', analysts: analystsCount + 2, avg: baseRev * 4.0, low: baseRev * 3.8, high: baseRev * 4.2, yearAgo: baseRev * 4.0 * (1 - growthRate), growth: growthRate },
    { period: 'Next Year', analysts: analystsCount + 2, avg: baseRev * 4.0 * (1 + growthRate), low: baseRev * 4.0, high: baseRev * 4.8, yearAgo: baseRev * 4.0, growth: growthRate },
  ];

  const surpriseBase = (rand1 > 0.5 ? 1 : -1) * (rand2 * 8);
  const earningsHistory: EarningsHistory[] = [
    { date: '2023-09-30', period: 'Q3 2023', estimate: baseEPS * 0.8, actual: baseEPS * 0.8 * (1 + (surpriseBase / 100)), surprise: surpriseBase },
    { date: '2023-12-31', period: 'Q4 2023', estimate: baseEPS * 0.9, actual: baseEPS * 0.9 * (1 + ((surpriseBase + 2) / 100)), surprise: surpriseBase + 2 },
    { date: '2024-03-31', period: 'Q1 2024', estimate: baseEPS * 0.85, actual: baseEPS * 0.85 * (1 + ((surpriseBase - 1.5) / 100)), surprise: surpriseBase - 1.5 },
    { date: '2024-06-30', period: 'Q2 2024', estimate: baseEPS, actual: baseEPS * (1 + ((surpriseBase + 3) / 100)), surprise: surpriseBase + 3 },
  ];

  const currentSimPrice = baseEPS * priceMultiplier;

  return {
    earningsEstimate,
    revenueEstimate,
    earningsHistory,
    recommendationTrend: recTrend,
    analystRating: baseRating,
    priceTarget: {
      low: currentSimPrice * 0.85,
      high: currentSimPrice * 1.3,
      average: currentSimPrice * 1.15
    },
    revenueVsEarnings: [
      { period: '2021', revenue: baseRev * 3, earnings: baseRev * 3 * 0.15 },
      { period: '2022', revenue: baseRev * 3.4, earnings: baseRev * 3.4 * 0.14 },
      { period: '2023', revenue: baseRev * 3.8, earnings: baseRev * 3.8 * 0.16 },
      { period: '2024', revenue: baseRev * 4.1, earnings: baseRev * 4.1 * 0.18 },
    ]
  };
};

// --- DATA FETCHERS ---
export const fetchInvestmentRecommendations = async (): Promise<InvestmentRecommendation[]> => {
  try {
    const radarData = await fetchValuationRadar();
    const today = new Date().toLocaleDateString('es-ES');

    // RESTORED ORIGINAL PROMPT
    const prompt = `
      Actúa como un Analista Senior de Valor. Fecha de hoy: ${today}. Tu objetivo es encontrar "Oportunidades de Compra" hoy.
      
      ESTRATEGIA DE BÚSQUEDA (Basada en AlexDitoInvesting y AcademiaDeInversoresUSA):
      Identifica ENTRE 1 y 4 acciones (MÁXIMO 4) que sean las mejores oportunidades de compra hoy.
      ORDENAMIENTO OBLIGATORIO: Ordena las recomendaciones de MAYOR a MENOR grado de convicción (la mejor oportunidad primero).
      
      Criterios de selección:
      - Valoración: P/E < media sector, PEG < 1.0.
      - Estabilidad: Debt-to-Equity < 1.0, ROE > 10%.
      - Crecimiento: BPA positivo, crecimiento futuro superior a competidores.
      Busca activamente menciones recientes de estos canales (Broadcom, Costco, Lululemon, Oracle, etc.) pero FILTRRA ESTRICTAMENTE.

      REGLA DE ORO (Filtro de Empresas Admitidas):
      SOLO puedes recomendar empresas que estén en esta lista:
      ${ALLOWED_COMPANIES.join(", ")}
      Si una empresa NO está en la lista anterior, NO la recomiendes.

      DATOS DEL RADAR DE VALORACIÓN (Referencia en Vivo):
      ${radarData}

      DETERMINACIÓN DE historicalMatch:
      - Compara la situación actual de cada empresa con estos CASOS HISTÓRICOS:
      ${HISTORICAL_JUSTIFICATIONS}
      - Si encuentras una analogía clara, completa 'historicalMatch' con:
        - matchedCompany: Nombre de la empresa histórica.
        - matchedDate: Fecha literal del registro histórico (ej: "03/01/2025").
        - contextSimilarity: Por qué el momento actual se parece a aquel momento histórico.
        - justification: La oportunidad detectada basada en la lógica del caso histórico.
      - Si no hay match claro, deja 'historicalMatch' null.

      ENTREGABLES (JSON):
      - ticker, companyName, riskLevel, suggestedBuyPrice (este es el PRECIO ACTUAL de mercado), asOfDate (Usa EXACTAMENTE esta fecha: ${today}), targetPrice, metrics, fundamentalThesis, technicalAnalysis, sectorTrends, companyCatalysts, valuationRadar, historicalMatch.
    `;

    console.log("Fetching live recommendations...");
    const response = await ai.models.generateContent({
      model: "models/gemini-2.0-flash-exp",
      contents: prompt,
      config: {
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
                }
              },
              fundamentalThesis: { type: Type.STRING },
              technicalAnalysis: { type: Type.STRING },
              sectorTrends: { type: Type.STRING },
              companyCatalysts: { type: Type.STRING },
              historicalMatch: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  matchedCompany: { type: Type.STRING },
                  matchedDate: { type: Type.STRING },
                  contextSimilarity: { type: Type.STRING },
                  justification: { type: Type.STRING }
                }
              },
              valuationRadar: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                  price: { type: Type.STRING },
                  marginSafe: { type: Type.STRING },
                  currentPER: { type: Type.STRING },
                  histPER: { type: Type.STRING },
                  status: { type: Type.STRING }
                }
              }
            }
          }
        },
        tools: [{ googleSearch: {} }]
      },
    });

    const recommendations = JSON.parse(response.text || "[]");
    return recommendations.map((rec: InvestmentRecommendation) => ({
      ...rec,
      logoUrl: COMPANY_LOGOS[rec.ticker] || `https://logo.clearbit.com/${rec.ticker.toLowerCase()}.com`
    }));

  } catch (error) {
    console.error("Gemini Recommendation Failed", error);
    return [];
  }
};

const mapYahooDataToStockData = (symbol: string, modules: any, priceData: any): StockData => {
  const price = modules.price || {};
  const summaryDetail = modules.summaryDetail || {};
  const summaryProfile = modules.summaryProfile || {};
  const defaultKeyStatistics = modules.defaultKeyStatistics || {};
  const financialData = modules.financialData || {};
  const getRaw = (obj: any) => obj?.raw || obj;

  let dayChangePercent = getRaw(price.regularMarketChangePercent) * 100;
  if (!dayChangePercent && priceData) {
    const regularPrice = getRaw(price.regularMarketPrice);
    const prevPrice = getRaw(price.regularMarketPreviousClose);
    if (regularPrice && prevPrice) {
      dayChangePercent = ((regularPrice - prevPrice) / prevPrice) * 100;
    }
  }

  let recommendationTrend: RecommendationTrend[] = [];
  if (modules.recommendationTrend && modules.recommendationTrend.trend) {
    recommendationTrend = modules.recommendationTrend.trend.map((t: any) => ({
      period: t.period,
      strongBuy: t.strongBuy,
      buy: t.buy,
      hold: t.hold,
      sell: t.sell,
      strongSell: t.strongSell
    })).slice(0, 5);
  }
  const rawEv = getRaw(defaultKeyStatistics.enterpriseValue);
  const evInMillions = rawEv ? rawEv / 1000000 : undefined;

  return {
    symbol: symbol,
    companyName: getRaw(price.shortName) || getRaw(price.longName) || symbol,
    currentPrice: getRaw(price.regularMarketPrice) || priceData?.price || 0,
    currency: getRaw(price.currency) || 'USD',
    dayChangePercent: dayChangePercent || priceData?.change || 0,
    logoUrl: `https://logo.clearbit.com/${getRaw(summaryProfile.website)?.replace(/^https?:\/\//, '') || symbol + '.com'}`,
    marketStatus: getRaw(price.marketState) === 'REGULAR' ? 'open' : 'closed',
    description: getRaw(summaryProfile.longBusinessSummary) || "No description available.",
    sector: getRaw(summaryProfile.sector),
    industry: getRaw(summaryProfile.industry),
    employees: getRaw(summaryProfile.fullTimeEmployees),
    website: getRaw(summaryProfile.website),
    address: getRaw(summaryProfile.address1),
    city: getRaw(summaryProfile.city),
    state: getRaw(summaryProfile.state),
    zip: getRaw(summaryProfile.zip),
    country: getRaw(summaryProfile.country),
    marketCap: getRaw(price.marketCap) ? (getRaw(price.marketCap) / 1000000000).toFixed(2) + 'B' : undefined,
    peRatio: getRaw(summaryDetail.trailingPE) || getRaw(summaryDetail.forwardPE),
    eps: getRaw(defaultKeyStatistics.trailingEps),
    fiftyTwoWeekHigh: getRaw(summaryDetail.fiftyTwoWeekHigh),
    fiftyTwoWeekLow: getRaw(summaryDetail.fiftyTwoWeekLow),
    volume: getRaw(summaryDetail.volume),
    enterpriseValue: evInMillions,
    trailingPE: getRaw(summaryDetail.trailingPE),
    forwardPE: getRaw(summaryDetail.forwardPE),
    pegRatio: getRaw(defaultKeyStatistics.pegRatio),
    priceToSales: getRaw(summaryDetail.priceToSalesTrailing12Months),
    priceToBook: getRaw(defaultKeyStatistics.priceToBook),
    enterpriseValueToRevenue: getRaw(defaultKeyStatistics.enterpriseValueToRevenue),
    enterpriseValueToEbitda: getRaw(defaultKeyStatistics.enterpriseValueToEbitda),
    profitMargin: getRaw(defaultKeyStatistics.profitMargins),
    operatingMargin: getRaw(financialData.operatingMargins),
    returnOnAssets: getRaw(financialData.returnOnAssets),
    returnOnEquity: getRaw(financialData.returnOnEquity),
    revenueTTM: getRaw(financialData.totalRevenue),
    revenuePerShare: getRaw(financialData.revenuePerShare),
    quarterlyRevenueGrowth: getRaw(financialData.revenueGrowth),
    grossProfit: getRaw(financialData.grossProfits),
    ebitda: getRaw(financialData.ebitda),
    dilutedEpsTTM: getRaw(defaultKeyStatistics.trailingEps),
    totalCash: getRaw(financialData.totalCash),
    totalCashPerShare: getRaw(financialData.totalCashPerShare),
    totalDebt: getRaw(financialData.totalDebt),
    totalDebtToEquity: getRaw(financialData.debtToEquity),
    currentRatio: getRaw(financialData.currentRatio),
    bookValuePerShare: getRaw(defaultKeyStatistics.bookValue),
    operatingCashFlow: getRaw(financialData.operatingCashflow),
    leveredFreeCashFlow: getRaw(financialData.freeCashflow),
    beta: getRaw(defaultKeyStatistics.beta),
    sharesOutstanding: getRaw(defaultKeyStatistics.sharesOutstanding),
    dividendYield: getRaw(summaryDetail.dividendYield),
    dividendRate: getRaw(summaryDetail.dividendRate),
    payoutRatio: getRaw(summaryDetail.payoutRatio),
    analystRating: getRaw(financialData.recommendationMean),
    priceTarget: {
      low: getRaw(financialData.targetLowPrice) || 0,
      high: getRaw(financialData.targetHighPrice) || 0,
      average: getRaw(financialData.targetMeanPrice) || 0
    },
    recommendationTrend: recommendationTrend
  };
};

const fetchGoogleFinanceData = async (symbol: string) => {
  try {
    const res = await fetch(`/api/google-finance/${symbol}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error("Failed to fetch Google Finance data", e);
  }
  return null;
};

export const fetchStockData = async (query: string): Promise<StockData> => {
  try {
    let yahooData;
    let googleData;

    try {
      const [yahooRes, googleRes] = await Promise.all([
        fetch(`/api/quote-summary/${query}`).then(r => r.json()).catch(() => ({})),
        fetchGoogleFinanceData(query)
      ]);
      yahooData = yahooRes.quoteSummary?.result?.[0];
      googleData = googleRes;
    } catch (e) { }

    if (!yahooData) {
      const searchResults = await searchSymbols(query);
      if (searchResults.length > 0) {
        const symbol = searchResults[0].symbol;
        try {
          // Retry Yahoo with solved symbol
          const res = await fetch(`/api/quote-summary/${symbol}`);
          const json = await res.json();
          yahooData = json.quoteSummary?.result?.[0];

          if (!googleData) {
            googleData = await fetchGoogleFinanceData(symbol);
          }
        } catch (e) { }
      }
    }

    let stockData: StockData;
    if (yahooData) {
      stockData = mapYahooDataToStockData(query.toUpperCase(), yahooData, null);
    } else {
      console.warn(`Falling back to mock data for ${query}`);
      stockData = generateMockStockData(query);
    }

    // Merge Google Finance Data (Priority Overwrite)
    if (googleData) {
      if (googleData.currentPrice) stockData.currentPrice = googleData.currentPrice;
      if (googleData.previousClose) stockData.previousClose = googleData.previousClose;
      if (googleData.dayLow) stockData.dayLow = googleData.dayLow;
      if (googleData.dayHigh) stockData.dayHigh = googleData.dayHigh;
      if (googleData.fiftyTwoWeekLow) stockData.fiftyTwoWeekLow = googleData.fiftyTwoWeekLow;
      if (googleData.fiftyTwoWeekHigh) stockData.fiftyTwoWeekHigh = googleData.fiftyTwoWeekHigh;
      if (googleData.marketCap) stockData.marketCap = googleData.marketCap;
      if (googleData.avgVolume) stockData.avgVolume = googleData.avgVolume;
      if (googleData.peRatio) stockData.trailingPE = googleData.peRatio;
      if (googleData.dividendYield) stockData.dividendYield = googleData.dividendYield;
      if (googleData.primaryExchange) stockData.exchange = googleData.primaryExchange;
    }

    // Recalculate change percent if we have new price and previous close from Google
    if (googleData?.currentPrice && googleData?.previousClose) {
      stockData.dayChangePercent = ((googleData.currentPrice - googleData.previousClose) / googleData.previousClose) * 100;
    }

    // Finnhub fallback
    if (!stockData.currentPrice && !googleData?.currentPrice) {
      const livePrice = await fetchFinnhubQuote(stockData.symbol);
      if (livePrice) {
        stockData.currentPrice = livePrice.price;
        stockData.dayChangePercent = livePrice.change;
      }
    }

    return stockData;
  } catch (error: any) {
    console.warn(`Falling back to mock data for ${query}`);
    return generateMockStockData(query);
  }
};

export const fetchAnalysisData = async (symbol: string): Promise<AnalysisData | null> => {
  try {
    const res = await fetch(`/api/quote-summary/${symbol}`);
    const json = await res.json();
    const result = json.quoteSummary?.result?.[0];

    if (!result) throw new Error("No data");

    const getRaw = (obj: any) => obj?.raw || obj;

    const mapEstimate = (est: any[]): EstimateRow[] => {
      if (!est) return [];
      return est.map((item: any) => ({
        period: item.period,
        analysts: getRaw(item.analysts),
        avg: getRaw(item.avg),
        low: getRaw(item.low),
        high: getRaw(item.high),
        yearAgo: getRaw(item.yearAgoEps) || getRaw(item.yearAgoRevenue),
        growth: getRaw(item.growth)
      })).slice(0, 4);
    };

    const mapHistory = (hist: any[]): EarningsHistory[] => {
      if (!hist) return [];
      return hist.map((item: any) => ({
        date: getRaw(item.quarter),
        period: item.period,
        estimate: getRaw(item.epsEstimate),
        actual: getRaw(item.epsActual),
        surprise: getRaw(item.surprisePercent) * 100
      })).slice(0, 4);
    };

    const revVsEarn = [];
    if (result.earningsTrend && result.earningsTrend.trend) {
      const yearly = result.earningsTrend.trend.filter((t: any) => t.period === '+1y' || t.period === '0y' || t.period === '-1y');
      for (const t of yearly) {
        revVsEarn.push({
          period: t.endDate || t.period,
          revenue: getRaw(t.revenueEstimate?.avg),
          earnings: getRaw(t.earningsEstimate?.avg) * getRaw(result.defaultKeyStatistics?.sharesOutstanding)
        });
      }
    }

    // Recommendation Trend with Month Formatting
    let recommendationTrend = [];
    if (result.recommendationTrend && result.recommendationTrend.trend) {
      recommendationTrend = result.recommendationTrend.trend.map((t: any) => {
        let periodLabel = t.period;
        if (typeof t.period === 'string' && t.period.endsWith('m')) {
          const offset = parseInt(t.period) || 0;
          const d = new Date();
          d.setMonth(d.getMonth() + offset);
          periodLabel = d.toLocaleString('en-US', { month: 'short' });
        }
        return {
          period: periodLabel,
          strongBuy: t.strongBuy,
          buy: t.buy,
          hold: t.hold,
          sell: t.sell,
          strongSell: t.strongSell
        };
      }).slice(0, 5);
    }

    const priceTarget = {
      low: getRaw(result.financialData?.targetLowPrice) || 0,
      high: getRaw(result.financialData?.targetHighPrice) || 0,
      average: getRaw(result.financialData?.targetMeanPrice) || 0
    };

    const analystRating = getRaw(result.financialData?.recommendationMean);

    return {
      priceTarget,
      recommendationTrend,
      analystRating,
      earningsEstimate: mapEstimate(result.earningsEstimate?.earningsEst),
      revenueEstimate: mapEstimate(result.revenueEstimate?.revenueEst),
      earningsHistory: mapHistory(result.earningsHistory?.history),
      revenueVsEarnings: revVsEarn.length > 0 ? revVsEarn : undefined
    };

  } catch (error) {
    console.warn(`Using Mock Analysis Data for ${symbol}`);
    return generateMockAnalysisData(symbol);
  }
};

export const fetchStockHistory = async (symbol: string, range: string): Promise<{ timestamp: number; price: number }[]> => {
  try {
    const res = await fetch(`/api/stock-history/${symbol}/${range}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    return [];
  }
};


export const fetchStockPrice = async (symbol: string): Promise<{ price: number; change: number } | null> => {
  const finnhubData = await fetchFinnhubQuote(symbol);
  if (finnhubData) return finnhubData;

  try {
    const data = await fetchYahoo(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
    const meta = data.chart?.result?.[0]?.meta;
    if (meta && meta.regularMarketPrice) {
      const price = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose || meta.previousClose;
      const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
      return { price, change };
    }
  } catch (e) { }
  const mock = generateMockStockData(symbol);
  return { price: mock.currentPrice, change: mock.dayChangePercent };
};

export const fetchMarketSentiment = async (): Promise<{ score: number; label: string }> => {
  try {
    const prompt = `
      Search for "current CNN Fear and Greed Index score". 
      Find the exact numeric value (0-100) from CNN Money or a reliable financial source for TODAY.
      Return strictly a JSON object: { "score": number, "label": "string" }.
    `;
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });
    let text = response.text || "";
    text = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1) return { score: 50, label: 'Neutral' };
    const data = JSON.parse(text.substring(firstBrace, lastBrace + 1));
    return { score: typeof data.score === 'number' ? data.score : 50, label: data.label || 'Neutral' };
  } catch (error) {
    return { score: 50, label: 'Neutral' };
  }
};

export const fetchCompanyNews = async (ticker: string) => {
  try {
    const res = await fetch(`/api/news/${ticker}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) return data;
    }
  } catch (e) {
    console.error("Failed to fetch news", e);
  }
  return [
    {
      source: 'Bloomberg',
      time: '2h ago',
      title: `${ticker} Reports Stronger-Than-Expected Quarterly Growth`,
      snippet: `Shares of ${ticker} rose in early trading after the company announced earnings that beat analyst estimates...`,
      url: `https://www.bloomberg.com/search?query=${ticker}`,
      tag: 'Earnings'
    },
    {
      source: 'Reuters',
      time: '5h ago',
      title: `Analysts Upgrade ${ticker} Price Target`,
      snippet: `Several major financial institutions have revised their outlook for ${ticker}...`,
      url: `https://www.reuters.com/search/news?blob=${ticker}`,
      tag: 'Analysis'
    }
  ];
};

export const fetchMarketNews = async () => {
  return await fetchCompanyNews('Economy');
};

export const searchSymbols = async (query: string): Promise<any[]> => {
  if (!query) return [];
  const finnhubResults = await fetchFinnhubSearch(query);
  if (finnhubResults.length > 0) return finnhubResults;
  try {
    const data = await fetchYahoo(`https://query1.finance.yahoo.com/v1/finance/search?q=${query}&quotesCount=10&newsCount=0&enableFuzzyQuery=true`);
    if (data.quotes && data.quotes.length > 0) {
      return data.quotes
        .filter((q: any) => q.quoteType !== 'OPTION')
        .map((q: any) => ({
          symbol: q.symbol,
          description: q.shortname || q.longname || q.symbol,
          type: q.quoteType,
          exchange: q.exchDisp || q.exchange
        }));
    }
  } catch (e) { }
  return [{ symbol: query.toUpperCase(), description: "Demo Asset (Offline)", type: "EQUITY", exchange: "DEMO" }];
};

export const analyzePortfolioData = async (portfolioString: string): Promise<string> => {
  try {
    const prompt = `
      Analyze this portfolio composition and provide strategic insights:
      ${portfolioString}

      Focus on:
      1. Diversification analysis (Sector/Geo)
      2. Risk assessment
      3. 2-3 specific actionable recommendations for optimization.
      
      Keep it concise (max 300 words). Use Markdown formatting.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });

    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to generate analysis");
  }
};
