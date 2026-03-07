import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage } from './SessionManager';

/**
 * VisionEngine.ts (v2.2.8 - God Mode Final Force)
 * Motor de visão ultrarrápido usando Gemini 2.0 Flash.
 * Esta versão remove telemetrias complexas para garantir o build.
 */
export class VisionEngine {
  static async generateVisionResponse(userName: string, input: string, imageUrl: string, history: ChatMessage[] = []): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) return 'ChefIA: API Key de visão não configurada.';

    try {
      console.log(`[Vision] Analisando imagem para ${userName}...`);
      
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      const genAI = new GoogleGenerativeAI(apiKey);
      // Modelo 2.0 Flash: O mais atual e recomendado pela comunidade
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Você é o ChefIA. Analise a foto e responda a ${userName}: "${input || 'Receita?'}"
Seja curto e direto. Português do Brasil sempre.`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType } }
      ]);

      return result.response.text() || 'Não consegui gerar texto para esta imagem.';

    } catch (error: any) {
      console.error('[Vision Error]:', error.message);
      return `ChefIA (Erro): ${error.message}`;
    }
  }
}
