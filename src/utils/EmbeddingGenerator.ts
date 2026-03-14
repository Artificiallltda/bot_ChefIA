import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * EmbeddingGenerator.ts
 * Transforma texto em vetores para busca semântica no Supabase.
 * Usa Gemini gemini-embedding-001 (3072 dimensões).
 */
export class EmbeddingGenerator {
  private static getModel() {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    return genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  }

  /**
   * Gera um vetor (embedding) para um texto usando Gemini embedding.
   */
  static async generate(text: string): Promise<number[]> {
    try {
      const model = this.getModel();
      const result = await model.embedContent(text.replace(/\n/g, ' '));
      return result.embedding.values;
    } catch (error: any) {
      console.error('[EmbeddingGenerator] Erro ao gerar vetor:', error.message);
      throw error;
    }
  }
}
