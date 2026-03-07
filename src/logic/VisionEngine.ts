import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from './SessionManager';
import fetch from 'node-fetch'; // Usando fetch global do Node 18+

export class VisionEngine {
  private static ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  static async generateVisionResponse(userName: string, input: string, imageUrl: string, history: ChatMessage[] = []): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      return 'ChefIA: Minha visão de raio-x está desativada no momento (GEMINI_API_KEY não configurada). Mas pode me descrever o prato!';
    }

    try {
      console.log(`[VisionEngine] Baixando imagem temporária para análise...`);
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Falha ao baixar a imagem do provedor.');
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = response.headers.get('content-type') || 'image/jpeg';

      console.log(`[VisionEngine] Imagem baixada (${mimeType}). Enviando para Gemini 2.5 Flash...`);

      const systemPrompt = `Você é o ChefIA, um Mentor Gastronômico experiente. O usuário ${userName} acabou de lhe enviar uma foto relacionada a culinária ou panificação. 
Analise a imagem com cuidado. Se for um pão ou massa, verifique a textura, cor da crosta, sinais de fermentação (pestana, alvéolos). 
Se for um prato, avalie o empratamento e os ingredientes visíveis. 
Responda de forma direta, encorajadora e como um chef profissional. 
A pergunta ou contexto do usuário é: "${input || 'O que você acha disso, Chef?'}"`;

      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  data: buffer.toString("base64"),
                  mimeType: mimeType
                }
              }
            ]
          }
        ]
      });

      return result.text || 'Hmm, não consegui ver os detalhes dessa foto claramente. Pode tentar mandar de outro ângulo?';

    } catch (error: any) {
      console.error('[VisionEngine] Erro durante análise visual:', error.message || error);
      return 'Tive uma irritação no olho e não consegui analisar a foto direito! Pode descrever o que está acontecendo?';
    }
  }
}
