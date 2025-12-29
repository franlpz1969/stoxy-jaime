
import fs from 'fs';
import { GoogleGenAI } from "@google/genai";

const envPath = '.env.local';
let apiKey = '';
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const match = envFile.match(/GEMINI_API_KEY=(.+)/);
    if (match) apiKey = match[1].trim();
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
    try {
        console.log("Listing models...");
        // Dependiendo de la librería @google/genai, esto puede variar
        // Intentaremos ver si tiene listModels o similar
        const models = await ai.models.list();
        console.log(JSON.stringify(models, null, 2));
    } catch (e) {
        console.error("Error listing models:", e.message);
    }
}

listModels();
