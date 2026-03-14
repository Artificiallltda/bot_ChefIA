import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config();

async function listSupportedModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERRO: GEMINI_API_KEY não encontrada no .env');
    return;
  }

  const client = new GoogleGenAI({ apiKey });
  
  try {
    console.log('--- TESTANDO MODELOS GEMINI 3.1 ---');
    
    const testModels = [
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite-preview',
      'gemini-3-pro-image-preview',
      'gemini-3.1-flash-image-preview'
    ];

    for (const modelName of testModels) {
      try {
        const response = await client.models.generateContent({
          model: modelName,
          contents: 'Responda apenas: OK',
          config: { maxOutputTokens: 10 },
        });
        console.log(`✅ Modelo '${modelName}' disponível. Resposta: ${response.text?.trim()}`);
      } catch (e: any) {
        console.log(`❌ Modelo '${modelName}' indisponível: ${e.message}`);
      }
    }
  } catch (error: any) {
    console.error('Erro ao listar modelos:', error.message);
  }
}

listSupportedModels();
