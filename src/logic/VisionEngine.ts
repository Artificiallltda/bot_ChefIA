import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage } from './SessionManager';

/**
 * VisionEngine.ts (v2.2.9 - Community Recommended Models)
 * Atualizado para a série 2.5/Latest conforme restrição do Google.
 */
export class VisionEngine {
  static async generateVisionResponse(userName: string, input: string, imageUrl: string, history: ChatMessage[] = []): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return 'ChefIA: API Key não encontrada.';

    try {
      console.log(`[Vision] Acionando modelos de próxima geração para ${userName}...`);
      
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Tentamos o 2.5 Flash ou o gemini-flash-latest (que o Google recomenda como substituto)
      const modelNames = ['gemini-2.0-flash-exp', 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];
      
      let lastError = '';
      for (const modelName of modelNames) {
        try {
          console.log(`[Vision] Tentando modelo: ${modelName}...`);
          const model = genAI.getGenerativeModel({ model: modelName });

          const prompt = `Você é o ChefIA. Analise a foto e responda a ${userName}: "${input || 'O que posso fazer com esses ingredientes?'}"
Seja direto e técnico. Responda em Português do Brasil sempre.`;

          const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType } }
          ]);

          const text = result.response.text();
          if (text) return text;
        } catch (e: any) {
          console.warn(`[Vision] Falha no modelo ${modelName}: ${e.message}`);
          lastError = e.message;
        }
      }

      throw new Error(`O Google recusou todos os modelos atuais. Motivo: ${lastError}`);

    } catch (error: any) {
      console.error('[Vision Error]:', error.message);
      return `ChefIA (Erro Série 2.5): ${error.message}. Comandante, verifique se sua chave suporta os modelos experimentais no Google AI Studio.`;
    }
  }
}
