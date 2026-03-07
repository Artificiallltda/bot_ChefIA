import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage } from './SessionManager';

/**
 * VisionEngine.ts (v2.2.7 - Ultimate Vision Fix)
 * Motor de visão multimodal com auto-correção de modelo.
 */
export class VisionEngine {
  static async generateVisionResponse(userName: string, input: string, imageUrl: string, history: ChatMessage[] = []): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey.includes('your-gemini')) {
      return 'ChefIA: Minha visão está desativada. Verifique a chave GEMINI_API_KEY no Railway!';
    }

    try {
      console.log(`[VisionEngine] Baixando imagem para análise técnica...`);
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`Falha no download da imagem (HTTP ${response.status})`);
      
      const buffer = await response.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      const genAI = new GoogleGenerativeAI(apiKey);
      
      // --- LÓGICA DE AUTO-REPARO DE MODELO ---
      // Tentamos o 2.0 Flash (Mais atual). Se falhar, tentamos o 1.5 Flash (Estável).
      const modelNames = ['gemini-2.0-flash', 'gemini-1.5-flash'];
      let lastError = '';

      for (const modelName of modelNames) {
        try {
          console.log(`[VisionEngine] Tentando análise com modelo: ${modelName}...`);
          const model = genAI.getGenerativeModel({ model: modelName });

          const prompt = `Você é o ChefIA, um Mentor Gastronômico.
O usuário ${userName} enviou uma foto de ingredientes ou pratos.
Identifique o que vê e responda à pergunta: "${input || 'O que posso fazer com isso?'}"
Responda de forma curta e técnica em Português do Brasil.`;

          const result = await model.generateContent([
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            }
          ]);

          const text = result.response.text();
          if (text) {
            console.log(`[VisionEngine] Sucesso com modelo ${modelName}!`);
            return text;
          }
        } catch (err: any) {
          console.warn(`[VisionEngine] Modelo ${modelName} falhou: ${err.message}`);
          lastError = err.message;
          continue; // Tenta o próximo modelo da lista
        }
      }

      throw new Error(`Todos os modelos de visão falharam. Último erro: ${lastError}`);

    } catch (error: any) {
      console.error('[VisionEngine] ERRO FINAL:', error.message);
      return `ChefIA (Erro de Visão): Não consegui interpretar a foto.
Motivo: ${error.message}
Dica: Se o erro for 'Model not found', o modelo que o Comandante sugeriu ainda não está liberado na sua região ou API Key.`;
    }
  }
}
