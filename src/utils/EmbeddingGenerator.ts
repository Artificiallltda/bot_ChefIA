import OpenAI from 'openai';

/**
 * EmbeddingGenerator.ts
 * Transforma texto em vetores para busca semântica no Supabase.
 */
export class EmbeddingGenerator {
  private static openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  /**
   * Gera um vetor (embedding) para um texto usando o modelo mais eficiente da OpenAI.
   */
  static async generate(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.replace(/\n/g, ' '), // Normalização para melhor precisão
      });

      return response.data[0].embedding;
    } catch (error: any) {
      console.error('[EmbeddingGenerator] Erro ao gerar vetor:', error.message);
      throw error;
    }
  }
}
