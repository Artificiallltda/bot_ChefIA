import { GoogleGenAI } from '@google/genai';

/**
 * EmbeddingGenerator.ts
 * Transforma texto em vetores para busca semântica no Supabase.
 * Migrado para Gemini text-embedding-004 (768 dimensões).
 */
export class EmbeddingGenerator {
  private static getClient(): GoogleGenAI {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  /**
   * Gera um vetor (embedding) para um texto usando o modelo Gemini text-embedding-004.
   */
  static async generate(text: string): Promise<number[]> {
    try {
      const client = this.getClient();
      const response = await client.models.embedContent({
        model: "text-embedding-004",
        contents: text.replace(/\n/g, ' '), // Normalização para melhor precisão
      });

      return response.embeddings![0].values!;
    } catch (error: any) {
      console.error('[EmbeddingGenerator] Erro ao gerar vetor:', error.message);
      throw error;
    }
  }
}
