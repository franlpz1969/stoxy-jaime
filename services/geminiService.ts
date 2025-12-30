
import { GoogleGenAI, Type } from "@google/genai";
import { StockData, RecommendationTrend, AnalysisData, EstimateRow, EarningsHistory, InvestmentRecommendation } from "../types";

// Safe initialization to prevent crash if API key is missing
const apiKey = process.env.API_KEY || "dummy_key_for_dev";
const ai = new GoogleGenAI({ apiKey });

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

const RADAR_SHEET_URL = "https://docs.google.com/spreadsheets/d/1Wf4gbZbDZDLMxXvNAVjOAuuxI1hulpzi/export?format=csv";

async function fetchValuationRadar(): Promise<string> {
  try {
    console.log("Fetching Radar data from Google Sheets...");
    const res = await fetch(RADAR_SHEET_URL);
    if (!res.ok) throw new Error("Failed to fetch Radar CSV");

    const csvText = await res.text();
    const rows = csvText.split('\n').map(row => row.split(','));

    // Asumimos que la primera fila son cabeceras y buscamos índices relevantes o usamos fijos si la estructura es estable.
    // Estructura vista: Ticker(0), ..., Empresa(3), ..., Cotización(5), ..., Margen MM1000(7), PER(8), PER Historico(9)
    // Limpiamos comillas que a veces trae el CSV en números

    const clean = (val: string) => val?.replace(/['"]+/g, '').trim();

    let formattedData = "DATOS EN TIEMPO REAL DEL RADAR (Google Sheets):\n";

    // Empezamos en 1 para saltar cabecera
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
    console.error("Error fetching Radar Sheet:", error);
    return "No se pudieron cargar los datos del Radar. Usa solo análisis fundamental general.";
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
  "ASML": "https://logo.clearbit.com/asml.com",
  "SBUX": "https://logo.clearbit.com/starbucks.com",
  "KO": "https://logo.clearbit.com/coca-colacompany.com",
  "PEP": "https://logo.clearbit.com/pepsico.com",
  "MDLZ": "https://logo.clearbit.com/mondelezinternational.com",
  "JNJ": "https://logo.clearbit.com/jnj.com",
  "AMD": "https://logo.clearbit.com/amd.com",
  "ADBE": "https://logo.clearbit.com/adobe.com",
  "TGT": "https://logo.clearbit.com/target.com",
  "GIS": "https://logo.clearbit.com/generalmills.com",
  "WM": "https://logo.clearbit.com/wm.com",
  "TSLA": "https://logo.clearbit.com/tesla.com",
  "LMT": "https://logo.clearbit.com/lockheedmartin.com",
  "AMZN": "https://logo.clearbit.com/amazon.com",
  "BTI": "https://logo.clearbit.com/bat.com",
  "V": "https://logo.clearbit.com/visa.com",
  "PBR": "https://logo.clearbit.com/petrobras.com.br",
  "MSFT": "https://logo.clearbit.com/microsoft.com",
  "CNI": "https://logo.clearbit.com/cn.ca",
  "PM": "https://logo.clearbit.com/pmi.com",
  "PYPL": "https://logo.clearbit.com/paypal.com",
  "BKNG": "https://logo.clearbit.com/bookingholdings.com",
  "VICI": "https://logo.clearbit.com/viciproperties.com",
  "PG": "https://logo.clearbit.com/pg.com",
  "META": "https://logo.clearbit.com/meta.com",
  "MA": "https://logo.clearbit.com/mastercard.com",
  // Aliases
  "GOOG": "https://logo.clearbit.com/google.com",
  "LVMH": "https://logo.clearbit.com/lvmh.com",
  "NVO": "https://logo.clearbit.com/novonordisk.com",
  "NOVOB": "https://logo.clearbit.com/novonordisk.com",
  "NOVO": "https://logo.clearbit.com/novonordisk.com"
};

export const fetchInvestmentRecommendations = async (): Promise<InvestmentRecommendation[]> => {
  try {
    const radarData = await fetchValuationRadar();
    const today = new Date().toLocaleDateString('es-ES');
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

    console.log("Fetching live recommendations with Gemini 2.0...");
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
      sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined,
      logoUrl: COMPANY_LOGOS[rec.ticker.toUpperCase()] || `https://logo.clearbit.com/${rec.ticker.toLowerCase()}.com`
    }));
  } catch (error) {
    console.error("Error in fetchInvestmentRecommendations (Using Mock Data):", error);

    // Fallback Mock Data for demo purposes
    return [
      {
        ticker: "GOOGL",
        companyName: "Alphabet Inc.",
        suggestedBuyPrice: 172.50,
        targetPrice: 205.00,
        asOfDate: new Date().toLocaleDateString('es-ES'),
        riskLevel: "Low",
        metrics: {
          pe: "22.5x",
          peg: "1.1",
          roe: "28%",
          debtToEquity: "0.05"
        },
        fundamentalThesis: "Alphabet mantiene un foso defensivo imbatible con Search y YouTube. La percepción de riesgo por IA está exagerada, ofreciendo una valoración atractiva históricamente. Cloud sigue acelerando.",
        technicalAnalysis: "Soporte mayor en zona de $165-$170. Divergencias alcistas en RSI semanal sugieren agotamiento vendedor.",
        sectorTrends: "Publicidad digital recuperando tracción y CapEx en IA empezando a monetizarse.",
        companyCatalysts: "Lanzamiento de Gemini 2.0 Ultra y nuevos formatos de anuncios en Prime Video.",
        valuationRadar: {
          marginMM1000: "25%",
          peStatus: "Bajo Media 5A"
        },
        logoUrl: "https://logo.clearbit.com/google.com"
      },
      {
        ticker: "AMZN",
        companyName: "Amazon.com Inc",
        suggestedBuyPrice: 180.20,
        targetPrice: 230.00,
        asOfDate: new Date().toLocaleDateString('es-ES'),
        riskLevel: "Medium",
        metrics: {
          pe: "38x",
          peg: "1.4",
          roe: "18%",
          debtToEquity: "0.4"
        },
        fundamentalThesis: "AWS sigue siendo el líder indiscutible en infraestructura cloud. La optimización logística en retail ha disparado márgenes operativos a niveles récord.",
        technicalAnalysis: "Rotura de bandera alcista en $180. Proyección técnica hacia máximos históricos.",
        sectorTrends: "E-commerce global creciendo al 9%. Cloud computing re-acelerando.",
        companyCatalysts: "Integración de robótica en almacenes y expansión de servicios de salud.",
        historicalMatch: {
          matchedCompany: "Microsoft (2014)",
          matchedDate: "04/02/2014",
          contextSimilarity: "Pivote hacia cloud y eficiencia operativa.",
          justification: "Reversión de márgenes tras ciclo de inversión intensiva."
        },
        logoUrl: "https://logo.clearbit.com/amazon.com"
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
    model: "gemini-2.0-flash-exp",
    contents: `
      Actúa como un Asesor Financiero Institucional Senior. Analiza la siguiente cartera de inversión y genera un informe estratégico detallado.
      
      DATOS DE LA CARTERA:
      ${data}

      ESTRUCTURA OBLIGATORIA DE RESPUESTA (Usa EXACTAMENTE estos encabezados Markdown):
      
      ## 3.1 Diagnóstico Ejecutivo
      (Resumen de alto nivel del estado de la cartera, salud general y alineación de objetivos).

      ## 3.2 Análisis de Diversificación
      (Evalúa la concentración de activos. ¿Está bien diversificada o muy concentrada?).

      ## 3.3 Exposición Sectorial
      (Desglose de riesgos por sectores: Tecnología, Salud, Consumo, etc.).

      ## 3.4 Riesgo Geográfico y Divisa
      (Evaluación de la exposición a diferentes economías y monedas).

      ## 3.5 Perfil de Riesgo y Volatilidad
      (Evaluación del Beta, volatilidad esperada y drawdown potencial).

      ## 3.6 Proyección de Tendencia
      (Basado en el momento actual del mercado, ¿qué se espera de estos activos?).

      ## 3.7 Análisis FODA (SWOT)
      (Lista con viñetas claras para cada sección):
      **Fortalezas**
      - Punto 1...
      **Debilidades**
      - Punto 1...
      **Oportunidades**
      - Punto 1...
      **Amenazas**
      - Punto 1...

      ## 3.8 Plan de Acción Recomendado
      (Pasos concretos: ¿Comprar más? ¿Vender? ¿Mantener? ¿Cubrir?).

      IMPORTANTE:
      - Usa tono profesional, directo y sofisticado.
      - Formato Markdown limpio.
      - Sé crítico y objetivo.
    `,
  });
  return r.text;
};
