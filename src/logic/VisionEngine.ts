import OpenAI from 'openai';
import { ChatMessage } from './SessionManager';

/**
 * VisionEngine.ts (v2.3.0 - OpenAI GPT-4o Vision)
 * Migrado para OpenAI para garantir estabilidade absoluta e alta precisão.
 */
export class VisionEngine {
  private static openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  static async generateVisionResponse(userName: string, input: string, imageUrl: string, history: ChatMessage[] = []): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      return 'ChefIA: Minha visão OpenAI está desativada. Verifique a OPENAI_API_KEY!';
    }

    try {
      console.log(`[Vision] Iniciando análise GPT-4o para ${userName}...`);

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Você é o ChefIA, um Mentor Gastronômico experiente. Analise a imagem enviada e responda como um Chef profissional, direto e técnico. Use Português do Brasil."
          },
          {
            role: "user",
            content: [
              { type: "text", text: input || "O que você vê nesta foto? Me dê uma receita se houver ingredientes." },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl, // OpenAI aceita a URL direta do Telegram! (Mais rápido e estável)
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
      });

      console.log(`[Vision] Análise GPT-4o concluída.`);
      return response.choices[0].message.content || 'Não consegui analisar a foto.';

    } catch (error: any) {
      console.error('[Vision Error OpenAI]:', error.message);
      return `ChefIA (Erro OpenAI): ${error.message}`;
    }
  }
}
