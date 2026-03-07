import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

async function listSupportedModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('ERRO: GEMINI_API_KEY não encontrada no .env');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    // Nota: O método listModels pode não estar disponível em todas as versões do SDK
    // Mas vamos tentar descobrir o modelo 2.0 ou 1.5 estável
    console.log('--- TESTANDO MODELOS DE VISÃO ---');
    
    const testModels = [
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    for (const modelName of testModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        console.log(`✅ Modelo '${modelName}' parece registrado no SDK.`);
      } catch (e) {
        console.log(`❌ Modelo '${modelName}' indisponível.`);
      }
    }
  } catch (error: any) {
    console.error('Erro ao listar modelos:', error.message);
  }
}

listSupportedModels();
