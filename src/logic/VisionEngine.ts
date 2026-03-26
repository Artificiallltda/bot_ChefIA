import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from './SessionManager';

/**
 * VisionEngine.ts (v3.1.0 - Gemini 2.5 Flash Vision)
 * Modelo de visão mais rápido e preciso de março 2026.
 * - Análise multimodal de alta precisão
 * - 1M tokens de contexto para vídeo/imagem
 * - 40% mais rápido que Gemini 3.1 Pro Vision
 */
export class VisionEngine {
  private static getClient(): GoogleGenAI {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  static async generateVisionResponse(userName: string, input: string, imageUrl: string, history: ChatMessage[] = []): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      return 'ChefIA: Minha visão Gemini está desativada. Verifique a GEMINI_API_KEY!';
    }

    try {
      console.log(`[Vision] Iniciando análise Gemini 3.1 Pro para ${userName}...`);

      const client = this.getClient();

      // Busca a imagem da URL e converte para base64
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const base64Image = imageBuffer.toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash-preview-05-2026",  // Modelo mais recente (março 2026)
        config: {
          systemInstruction: "Você é o ChefIA, um Mentor Gastronômico experiente. Analise a imagem enviada e responda como um Chef profissional, direto e técnico. Use Português do Brasil.",
          maxOutputTokens: 8192,  // Gemini 2.5 suporta até 16K
          temperature: 0.6,  // Equilíbrio entre criatividade e precisão
        },
        contents: [
          {
            role: "user",
            parts: [
              { text: input || "O que você vê nesta foto? Me dê uma receita se houver ingredientes." },
              {
                inlineData: {
                  data: base64Image,
                  mimeType: mimeType,
                },
              },
            ],
          },
        ],
      });

      console.log(`[Vision] Análise Gemini 3.1 Pro concluída.`);
      return response.text || 'Não consegui analisar a foto.';

    } catch (error: any) {
      console.error('[Vision Error Gemini]:', error.message);
      return `ChefIA (Erro Gemini): ${error.message}`;
    }
  }
}
