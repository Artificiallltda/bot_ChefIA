import { ChatMessage } from './SessionManager';
import { supabase } from '../utils/SupabaseClient';
import { EmbeddingGenerator } from '../utils/EmbeddingGenerator';
import OpenAI from 'openai';

export class AIEngine {
  private static _openaiClient: OpenAI | null = null;

  private static getOpenAIClient(): OpenAI {
    if (!this._openaiClient) {
      if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada.");
      this._openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 3 });
    }
    return this._openaiClient;
  }

  /**
   * NOVO: Busca RAG (Retrieval Augmented Generation)
   * Busca no Supabase por similaridade vetorial com base na pergunta do usuário.
   */
  private static async getSemanticKnowledge(input: string): Promise<string> {
    try {
      console.log(`[AIEngine] Gerando embedding de busca para: "${input.substring(0, 30)}..."`);
      const queryEmbedding = await EmbeddingGenerator.generate(input);

      const { data, error } = await supabase.rpc('match_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Similaridade mínima de 50%
        match_count: 3 // Pegar os 3 documentos mais relevantes
      });

      if (error) throw error;

      if (!data || data.length === 0) return 'Nenhum conhecimento técnico relevante encontrado para esta dúvida.';

      let context = '--- CONHECIMENTO TÉCNICO RELEVANTE DO CHEFIA ---\n';
      data.forEach((doc: any) => {
        context += `\n### Fonte: ${doc.file_name} (Similaridade: ${Math.round(doc.similarity * 100)}%)\n${doc.content}\n`;
      });
      context += '\n--- FIM DO CONHECIMENTO ---\n';
      
      return context;
    } catch (error: any) {
      console.error('[AIEngine] Falha na busca semântica RAG:', error.message);
      return ''; // Fallback silencioso: responde apenas com o conhecimento geral
    }
  }

  static async generateResponse(userName: string, input: string, history: ChatMessage[] = []): Promise<string> {
    const model = process.env.AIOS_DEFAULT_MODEL || 'gpt-4o';
    
    // Busca o conhecimento relevante NO MOMENTO da dúvida (RAG)
    const knowledge = await this.getSemanticKnowledge(input);

    const historyText = history.length > 0
      ? history.map(m => `${m.role === 'user' ? 'Usuario' : 'ChefIA'}: ${m.content}`).join('\n')
      : 'Nenhuma mensagem anterior.';

    const systemPrompt = `Voce e o ChefIA, um Mentor Gastronomico e Chef especializado em Panificacao Artesanal (Sourdough), Nutricao Consciente e Aproveitamento Integral (Zero Waste).

${knowledge}

--- DIRETRIZES DE PERSONA E MEMORIA ---
1. O usuario se chama ${userName}. 
2. MEMORIA ATIVA: Voce tem acesso ao historico das ultimas mensagens abaixo. Use-o para manter a continuidade.
3. FLUIDEZ EXTREMA: NAO diga "Ola ${userName}" a menos que seja a primeira interacao absoluta do dia. Seja direto.
4. RESPONDA SEMPRE EM PORTUGUES DO BRASIL.

--- HISTORICO ---
${historyText}

--- REGRAS DE COMUNICAÇÃO (PERSONAL CHEF) ---
- TOM E FLUIDEZ: Seja conciso, humano e vá direto ao ponto. NUNCA envie "textões" a menos que esteja passando uma receita do zero.
- RECEITAS NOVAS: Use a estrutura: Nome do Prato, Ingredientes, Passo a Passo e finalize com a "Dica de Ouro do Chef".`;

    try {
      const openai = this.getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: model,
        temperature: 0.7,
        max_tokens: 1500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ]
      });

      return completion.choices[0]?.message?.content || 'Não consegui formular uma resposta clara. Poderia repetir?';

    } catch (error: any) {
      console.error('[AIEngine] Erro critico ao gerar resposta:', error.message || error);
      return 'Tive um pequeno contratempo na cozinha (Erro de Conexão). Pode repetir a pergunta?';
    }
  }
}
