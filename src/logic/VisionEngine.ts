import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage } from './SessionManager';
import fetch from 'node-fetch';

/**
 * VisionEngine.ts (v2.2.3 - Stable Vision)
 * Motor de visão oficial via @google/generative-ai.
 */
export class VisionEngine {
  private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  static async generateVisionResponse(userName: string, input: string, imageUrl: string, history: ChatMessage[] = []): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      return 'ChefIA: Minha visão de raio-x está desativada no momento (GEMINI_API_KEY não configurada). Mas pode me descrever o prato!';
    }

    try {
      console.log(`[VisionEngine] Baixando imagem para análise...`);
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Falha ao baixar a imagem.');
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      console.log(`[VisionEngine] Imagem baixada (${mimeType}). Acionando Gemini 2.0 Flash...`);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Você é o ChefIA, um Mentor Gastronômico e Chef executivo.
O usuário ${userName} enviou uma imagem.
Analise os ingredientes ou pratos visíveis na foto.

--- DIRETRIZES ---
1. Identifique TUDO o que está na foto (ex: marcas de tomate pelado, tipo de massa, creme de leite, etc).
2. Responda de forma direta e concisa (como um Chef em serviço).
3. Se o usuário pediu uma receita, use os ingredientes da foto como base principal.
4. Pergunta do usuário: "${input || 'O que você acha disso, Chef?'}"
5. Responda SEMPRE em Português do Brasil.`;

      const imagePart = {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const resultResponse = await result.response;
      
      return resultResponse.text() || 'Hmm, não consegui ver os detalhes dessa foto claramente.';

    } catch (error: any) {
      console.error('[VisionEngine] Erro durante análise visual:', error.message || error);
      return 'ChefIA: Tive um problema ao processar a foto. Pode me descrever o que está acontecendo?';
    }
  }
}
