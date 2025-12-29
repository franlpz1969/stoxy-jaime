
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

const VALUATION_RADAR_DATA = `
SISTEMA DE VALORACIÓN (Radar OscarYan 2.0):
- Margen MM1000: Diferencia entre cotización y media de 1000 sesiones. > 0% = Descuento.
- PER vs Histórico: Comparación de múltiplos.

EMPRESAS INFRAVALORADAS (MM1000 > 0%):
1. Diageo (DGE): Margen +44.75%, PER 20.44 (vs 25 hist). Muy infravalorada.
2. Nike (NKE): Margen +35.33%, PER 35.7 (vs 34 hist). Descuento técnico, PER justo.
3. UnitedHealth (UNH): Margen +31.75%, PER 17.19 (vs 23.5 hist). Muy infravalorada.
4. Target (TGT): Margen +30.44%, PER 11.9 (vs 19 hist). Muy infravalorada.
5. General Mills (GIS): Margen +30.28%, PER 10.09 (vs 16 hist). Muy infravalorada.
6. Pfizer (PFE): Margen +26.76%, PER 14.58 (vs 14 hist). En precio, descuento técnico.
7. Zoetis (ZTS): Margen +24.77%, PER 21.28 (vs 39 hist). Muy infravalorada.
8. Comcast (CMCSA): Margen +22.69%, PER 4.95 (vs 18 hist). Infravaloración extrema.
9. Mondelez (MDLZ): Margen +17.42%, PER 20.47 (vs 22 hist). Atractiva.
10. PepsiCo (PEP): Margen +12.61%, PER 27.45 (vs 26 hist). Descuento técnico.
11. LVMH (MC.PA): Margen +6.15%, PER 28.78 (vs 28 hist). En precio.
12. Starbucks (SBUX): Margen +6.93%, PER 52.46 (vs 30 hist). Cara por beneficios, descuento técnico.
13. Canadian National (CNI): Margen +12.26%, PER 18.46 (vs 21 hist). Atractiva.
14. Alexandria (ARE): Margen +58.29%. Descuento masivo por sector REIT.

EMPRESAS SOBREVALORADAS (Evitar):
- Microsoft (MSFT), Alphabet (GOOGL), Apple (AAPL), Amazon (AMZN), Meta (META), American Express (AXP). Todas cotizan muy por encima de su MM1000 (márgenes negativos).
`;

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

export const fetchInvestmentRecommendations = async (): Promise<InvestmentRecommendation[]> => {
  try {
    const prompt = `
      Actúa como un Analista Senior de Valor. Tu objetivo es encontrar "Oportunidades de Compra" basadas en el "Radar de Valoración" adjunto.
      
      DATOS DEL RADAR DE VALORACIÓN:
      ${VALUATION_RADAR_DATA}

      UNIVERSO DE INVERSIÓN:
      - Fondos Indexados: Vanguard Global Stock Index.
      - Cripto: BTC.
      - Acciones Globales: Cualquier acción de alta calidad.

      INSTRUCCIONES DE SELECCIÓN Y RADAR:
      1. Selecciona de 2 a 4 activos interesantes hoy.
      2. REVISIÓN DE RADAR: Si el activo está en el RADAR OSCARYAN, incluye sus datos en el campo 'valuationRadar'.
      3. Si el activo NO está en el radar, deja 'valuationRadar' vacío.
      4. No restrinjas las recomendaciones solo a las del radar, pero úsalo como referencia de valor.

      REQUISITOS DEL ANÁLISIS:
      1. ANÁLISIS FUNDAMENTAL: Detalla Moat y métricas del radar.
      2. ANÁLISIS TÉCNICO: Explica el soporte respecto a la MM1000.
      3. TENDENCIA DEL SECTOR: Contexto.

      ENTREGABLES (JSON):
      - ticker, companyName, riskLevel, suggestedBuyPrice, targetPrice, metrics, fundamentalThesis, technicalAnalysis, sectorTrends, companyCatalysts, valuationRadar, historicalMatch.

      DETERMINACIÓN DE historicalMatch:
      - Compara la situación actual de cada empresa con estos CASOS HISTÓRICOS:
      ${HISTORICAL_JUSTIFICATIONS}
      - Si encuentras una analogía clara, completa 'historicalMatch' con:
        - matchedCompany: Nombre de la empresa histórica.
        - matchedDate: La FECHA exacta que aparece en el registro histórico (ej: "03/01/2025"). CRÍTICO: Debe ser la fecha literal del archivo.
        - contextSimilarity: Por qué el momento actual se parece a aquel momento histórico.
        - justification: Cuál es la oportunidad detectada que justifica la compra hoy (basándote en la lógica del caso histórico).
      - Si no hay match claro, deja 'historicalMatch' null.
    `;

    console.log("Fetching recommendations with Radar context (Flash)...");
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
                },
                required: ['pe', 'peg', 'roe', 'debtToEquity']
              },
              fundamentalThesis: { type: Type.STRING },
              technicalAnalysis: { type: Type.STRING },
              sectorTrends: { type: Type.STRING },
              companyCatalysts: { type: Type.STRING },
              valuationRadar: {
                type: Type.OBJECT,
                properties: {
                  marginMM1000: { type: Type.STRING },
                  peStatus: { type: Type.STRING }
                }
              },
              historicalMatch: {
                type: Type.OBJECT,
                properties: {
                  matchedCompany: { type: Type.STRING },
                  matchedDate: { type: Type.STRING },
                  contextSimilarity: { type: Type.STRING },
                  justification: { type: Type.STRING }
                }
              }
            },
            required: ['ticker', 'companyName', 'suggestedBuyPrice', 'targetPrice', 'asOfDate', 'riskLevel', 'metrics', 'fundamentalThesis', 'technicalAnalysis', 'sectorTrends', 'companyCatalysts']
          }
        }
      }
    });

    if (!response.text) {
      console.warn("Gemini returned empty response text");
      return [];
    }

    const recommendations = JSON.parse(response.text);
    console.log("Recommendations generated:", recommendations);

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourceUrls = chunks.map((c: any) => c.web?.uri).filter(Boolean);

    return recommendations.map((rec: any) => ({
      ...rec,
      sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined
    }));
  } catch (error) {
    console.error("Critical error in fetchInvestmentRecommendations, using full fallback list:", error);
    return [
      {
        ticker: "DGE",
        companyName: "Diageo plc",
        suggestedBuyPrice: 2400,
        targetPrice: 3000,
        asOfDate: new Date().toISOString().split('T')[0],
        riskLevel: "Low",
        metrics: { pe: "20.4", peg: "1.2", roe: "30%", debtToEquity: "1.5" },
        fundamentalThesis: "Líder mundial con margen MM1000 del +44.75%.",
        technicalAnalysis: "Soporte histórico mayor.",
        sectorTrends: "Consumo defensivo estable.",
        companyCatalysts: "Recuperación de márgenes.",
        valuationRadar: { marginMM1000: "+44.75%", peStatus: "Undervalued (20 vs 25)" },
        historicalMatch: {
          matchedCompany: "UPS",
          matchedDate: "03/01/2025",
          contextSimilarity: "Líder de sector castigado con dividendos altos.",
          justification: "Se compra un líder con descuento histórico esperando reversión a la media."
        }
      },
      {
        ticker: "UNH",
        companyName: "UnitedHealth Group",
        suggestedBuyPrice: 480,
        targetPrice: 600,
        asOfDate: new Date().toISOString().split('T')[0],
        riskLevel: "Low",
        metrics: { pe: "17.2", peg: "1.1", roe: "25%", debtToEquity: "0.6" },
        fundamentalThesis: "Líder en salud con margen MM1000 del +31.75%.",
        technicalAnalysis: "Rebote en zona de valor.",
        sectorTrends: "Sector salud resiliente.",
        companyCatalysts: "Crecimiento continuo.",
        valuationRadar: { marginMM1000: "+31.75%", peStatus: "Undervalued (17 vs 23.5)" }
      },
      {
        ticker: "TGT",
        companyName: "Target Corporation",
        suggestedBuyPrice: 140,
        targetPrice: 180,
        asOfDate: new Date().toISOString().split('T')[0],
        riskLevel: "Medium",
        metrics: { pe: "11.9", peg: "0.9", roe: "22%", debtToEquity: "1.2" },
        fundamentalThesis: "Margen MM1000 del +30.44% con valoración atractiva.",
        technicalAnalysis: "Soporte en mínimos plurianuales.",
        sectorTrends: "Consumo discrecional.",
        companyCatalysts: "Mejora operativa.",
        valuationRadar: { marginMM1000: "+30.44%", peStatus: "Undervalued (11.9 vs 19)" },
        historicalMatch: {
          matchedCompany: "Adobe",
          matchedDate: "03/01/2025",
          contextSimilarity: "Oportunidad de entrada 'barata' por pesimismo temporal.",
          justification: "Aprovechamiento de la caída de precio por expectativas no cumplidas en una empresa con fundamentales sólidos."
        }
      }
    ];
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
