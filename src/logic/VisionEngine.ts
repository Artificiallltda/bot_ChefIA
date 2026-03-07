import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatMessage } from './SessionManager';

/**
 * VisionEngine.ts (v2.2.5 - Native Fetch Fix)
 * Motor de visão otimizado para Gemini 1.5 Flash.
 */
export class VisionEngine {
  private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  static async generateVisionResponse(userName: string, input: string, imageUrl: string, history: ChatMessage[] = []): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      return 'ChefIA: Minha visão está desativada (falta GEMINI_API_KEY). Descreva os ingredientes para mim!';
    }

    try {
      console.log(`[VisionEngine] Iniciando análise visual para ${userName}...`);
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Falha ao baixar imagem do Telegram.');
      
      const buffer = await response.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      // Usando 1.5-flash: O cavalo de batalha mais estável para visão
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `Você é o ChefIA, um Mentor Gastronômico experiente.
O usuário ${userName} te enviou uma FOTO de ingredientes ou pratos.

--- MISSÃO ---
1. Analise a imagem e identifique TUDO o que é visível (ex: macarrão, marca do tomate, creme de leite).
2. Use o contexto da pergunta do usuário: "${input || 'O que posso fazer com isso, Chef?'}"
3. Responda de forma curta, técnica e encorajadora.
4. Se for um pedido de receita, dê o passo a passo baseado estritamente no que você está vendo.

RESPONDA SEMPRE EM PORTUGUÊS DO BRASIL.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        }
      ]);

      const textResponse = result.response.text();
      console.log(`[VisionEngine] Análise concluída com sucesso.`);
      return textResponse;

    } catch (error: any) {
      console.error('[VisionEngine] Erro crítico:', error.message);
      return 'ChefIA: Tive um problema ao processar essa foto. Pode tentar me mandar de novo ou descrever os itens?';
    }
  }
}
