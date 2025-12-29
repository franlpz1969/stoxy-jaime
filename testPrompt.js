
import fs from 'fs';
import { GoogleGenAI, Type } from "@google/genai";

// Leer .env.local manualmente para evitar dependencia de dotenv en el test
const envPath = '.env.local';
let apiKey = '';
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const match = envFile.match(/GEMINI_API_KEY=(.+)/);
    if (match) apiKey = match[1].trim();
}

if (!apiKey) {
    console.error("No se encontró la API Key en .env.local");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

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

async function testPrompt() {
    const prompt = `
      Actúa como un Analista Senior de Valor. Tu objetivo es encontrar "Oportunidades de Compra" hoy.

      ESTRATEGIA DE BÚSQUEDA (Basada en AlexDitoInvesting y AcademiaDeInversoresUSA):
      Identifica de 1 a 4 acciones que sean buenos candidatos basándote en:
      - Valoración: P/E < media sector, PEG < 1.0.
      - Estabilidad: Debt-to-Equity < 1.0, ROE > 10%.
      - Crecimiento: BPA positivo, crecimiento futuro superior a competidores.
      Busca activamente menciones recientes de estos canales (Broadcom, Costco, Lululemon, Oracle, etc.) pero FILTRRA ESTRICTAMENTE.

      REGLA DE ORO (Filtro de Empresas Admitidas):
      SOLO puedes recomendar empresas que estén en esta lista:
      ${ALLOWED_COMPANIES.join(", ")}
      Si una empresa NO está en la lista anterior, NO la recomiendes.

      ENTREGABLES (JSON):
      - ticker, companyName, metrics, fundamentalThesis.
    `;

    console.log("--- EJECUTANDO BÚSQUEDA DE IA ---");

    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash-latest",
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
                            metrics: { type: Type.OBJECT, properties: { pe: { type: Type.STRING }, peg: { type: Type.STRING } } },
                            fundamentalThesis: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        console.log("\nRESULTADOS ENCONTRADOS QUE RESPETAN EL FILTRO:\n");
        console.log(response.text);
        console.log("\n------------------------------------------------------");
    } catch (e) {
        console.error("Error al conectar con Gemini:", e.message);
    }
}

testPrompt();
