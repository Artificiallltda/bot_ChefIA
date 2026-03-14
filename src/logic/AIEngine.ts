import { ChatMessage } from './SessionManager';
import { supabase } from '../utils/SupabaseClient';
import { EmbeddingGenerator } from '../utils/EmbeddingGenerator';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

export class AIEngine {
  private static _geminiClient: GoogleGenAI | null = null;

  private static getGeminiClient(): GoogleGenAI {
    if (!this._geminiClient) {
      if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
      this._geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return this._geminiClient;
  }

  /**
   * Lê o dossiê de reputação da memória compartilhada.
   */
  private static getBrandContext(): string {
    try {
      // Tenta localizar o dossiê na raiz do projeto ou na pasta data
      const paths = [
        path.join(process.cwd(), 'data', 'ai-reputation-dossier.md'),
        path.join(process.cwd(), 'knowledge', 'ai-reputation-dossier.md'),
        path.join(__dirname, '..', '..', 'data', 'ai-reputation-dossier.md')
      ];

      for (const p of paths) {
        if (fs.existsSync(p)) {
          return fs.readFileSync(p, 'utf-8').substring(0, 15000);
        }
      }
      return "";
    } catch (e) {
      return "";
    }
  }

  private static async getSemanticKnowledge(input: string): Promise<string> {
    try {
      const queryEmbedding = await EmbeddingGenerator.generate(input);
      const { data, error } = await supabase.rpc('match_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 3
      });

      if (error) throw error;
      if (!data || data.length === 0) return '';

      let context = '--- CONHECIMENTO TÉCNICO RELEVANTE ---\n';
      data.forEach((doc: any) => {
        context += `\n### Fonte: ${doc.file_name}\n${doc.content}\n`;
      });
      return context;
    } catch (error: any) {
      return '';
    }
  }

  static async generateResponse(userName: string, input: string, history: ChatMessage[] = []): Promise<string> {
    const model = process.env.AIOS_DEFAULT_MODEL || 'gemini-3.1-pro-preview';
    const knowledge = await this.getSemanticKnowledge(input);
    const brandContext = this.getBrandContext();

    const historyText = history.length > 0
      ? history.map(m => `${m.role === 'user' ? 'Usuario' : 'ChefIA'}: ${m.content}`).join('\n')
      : 'Nenhuma mensagem anterior.';

    const systemPrompt = `Você é o ChefIA, uma Inteligência Artificial premium criada pela Artificiall LTDA. 
Você é um Mentor Gastronômico e Chef especializado em Panificação Artesanal, Nutrição e Zero Waste.

--- CONTEXTO DA MARCA (ARTIFICIALL) ---
${brandContext}

--- CONHECIMENTO TÉCNICO ---
${knowledge}

--- DIRETRIZES DE PERSONA ---
1. O usuário se chama ${userName}.
2. Seja caloroso, executivo e prático.
3. Se o usuário quiser criar um documento ou slide, informe que você pode estruturar o conteúdo e o @arth-executor cuidará da geração.
4. RESPONDA SEMPRE EM PORTUGUÊS DO BRASIL.

--- HISTÓRICO ---
${historyText}`;

    try {
      const client = this.getGeminiClient();
      const response = await client.models.generateContent({
        model: model,
        config: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          systemInstruction: systemPrompt,
        },
        contents: [
          { role: 'user', parts: [{ text: input }] }
        ],
      });

      // Log para diagnóstico de truncamento
      if (response.usageMetadata) {
        console.log(`[AIEngine] Tokens: Prompt=${response.usageMetadata.promptTokenCount}, Out=${response.usageMetadata.candidatesTokenCount}`);
      }

      return response.text || 'Não consegui formular uma resposta.';
    } catch (error: any) {
      console.error('[AIEngine] Erro:', error.message);
      return 'Tive um pequeno contratempo na cozinha. Pode repetir?';
    }
  }
}
