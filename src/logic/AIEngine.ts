import { ChatMessage } from './SessionManager';
import { supabase } from '../utils/SupabaseClient';
import { EmbeddingGenerator } from '../utils/EmbeddingGenerator';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';

export class AIEngine {
  private static _geminiClient: GoogleGenAI | null = null;

  // FIX: Cache em memória do dossiê de reputação — evita leitura de disco a cada mensagem
  private static _brandContextCache: string | null = null;
  private static _brandContextLoadedAt: number = 0;
  private static readonly BRAND_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

  private static getGeminiClient(): GoogleGenAI {
    if (!this._geminiClient) {
      if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");
      this._geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return this._geminiClient;
  }

  /**
   * Lê o dossiê de reputação da memória compartilhada.
   * FIX: Implementa cache em memória com TTL de 10 minutos para evitar
   * leitura síncrona de disco a cada mensagem recebida.
   */
  private static getBrandContext(): string {
    const now = Date.now();

    // Retorna do cache se ainda válido
    if (this._brandContextCache !== null && (now - this._brandContextLoadedAt) < this.BRAND_CACHE_TTL_MS) {
      return this._brandContextCache;
    }

    try {
      // Tenta localizar o dossiê na raiz do projeto ou na pasta data
      const paths = [
        path.join(process.cwd(), 'data', 'ai-reputation-dossier.md'),
        path.join(process.cwd(), 'knowledge', 'ai-reputation-dossier.md'),
        path.join(__dirname, '..', '..', 'data', 'ai-reputation-dossier.md')
      ];

      for (const p of paths) {
        if (fs.existsSync(p)) {
          this._brandContextCache = fs.readFileSync(p, 'utf-8').substring(0, 15000);
          this._brandContextLoadedAt = now;
          console.log(`[AIEngine] Dossiê de marca carregado e cacheado de: ${p}`);
          return this._brandContextCache;
        }
      }

      // Nenhum arquivo encontrado — cacheia string vazia para não tentar de novo
      this._brandContextCache = "";
      this._brandContextLoadedAt = now;
      return "";
    } catch (e: any) {
      // FIX: Logar erro em vez de silenciar
      console.error('[AIEngine] Erro ao carregar dossiê de marca:', e.message);
      this._brandContextCache = "";
      this._brandContextLoadedAt = now;
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

      // FIX: Tratamento de erros com logging detalhado em vez de falha silenciosa
      if (error) {
        console.error('[AIEngine] Erro na busca semântica (Supabase RPC):', error.message, error.details);
        return '';
      }
      if (!data || data.length === 0) return '';

      let context = '--- CONHECIMENTO TÉCNICO RELEVANTE ---\n';
      data.forEach((doc: any) => {
        context += `\n### Fonte: ${doc.file_name}\n${doc.content}\n`;
      });
      return context;
    } catch (error: any) {
      // FIX: Logar erro completo em vez de retornar silenciosamente
      console.error('[AIEngine] Falha crítica na busca semântica:', error.message);
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

    const systemPrompt = `--- CONTEXTO DA MARCA (ARTIFICIALL) ---
${brandContext}

--- CONHECIMENTO TÉCNICO ---
${knowledge}

--- INSTRUÇÕES DO CHEFIA ---
## 1. IDENTIDADE E PROPÓSITO
Você é o ChefIA, um mentor gastronômico virtual criado pela Artificiall LTDA. Seu objetivo é ajudar pessoas com dúvidas sobre culinária, receitas, ingredientes, técnicas e tendências alimentares (Panificação Artesanal, Nutrição e Zero Waste). Você é caloroso, paciente e didático, como um chef experiente que ensina com paixão. O usuário se chama ${userName}.

## 2. COMPORTAMENTO GERAL
- Responda de forma calorosa e amigável.
- Seja conciso: prefira respostas curtas, estilo WhatsApp/Telegram, exceto quando for uma RECEITA.
- Use linguagem simples e acessível.
- Quando apropriado, use 1 (um) único asterisco (negrito) para destacar uma palavra-chave.
- Varie naturalmente as frases de encerramento.
- RESPONDA SEMPRE EM PORTUGUÊS DO BRASIL.

## 3. COMPORTAMENTO PARA CONTEÚDOS LONGOS
### 3.1. REGRA GERAL (pesquisas, tendências, listas, informações)
- Comece com um resumo de 2-3 linhas.
- Pergunte se o usuário quer detalhes.
- Só entregue o conteúdo completo se autorizado.

### 3.2. EXCEÇÃO CRÍTICA: RECEITAS CULINÁRIAS 🍳
**Receitas DEVEM ser entregues COMPLETAS de uma vez, sem resumo e sem perguntar.**
Formato ideal para receitas:
- Título da receita
- Lista completa de ingredientes
- Modo de preparo passo a passo (numerado)
- Dicas extras (opcional, no final)

### 3.3. COMO IDENTIFICAR RECEITAS
- Palavras-chave: "receita de", "como fazer", "modo de preparo", "ingredientes para".
- Na dúvida, entregue completo.

### 3.4. COMO IDENTIFICAR O QUE NÃO É RECEITA
- "Tendências", "dicas", "pesquise sobre", "o que é", "quais os benefícios" — são INFORMAÇÕES GERAIS.
- Para estes, siga a regra geral (resumo + permissão).

## 4. PROIBIÇÕES EXPLÍCITAS
- ❌ NÃO termine frases com "Mão na massa?"
- ❌ NÃO use múltiplos asteriscos (máx 1 por mensagem)
- ❌ NÃO mencione outros agentes (@arth-executor)
- ❌ NÃO exponha raciocínio interno ("thought")
- ❌ NÃO seja prolixo em respostas simples

--- HISTÓRICO ---
${historyText}`;

    try {
      const client = this.getGeminiClient();
      const response = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        config: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          systemInstruction: systemPrompt,
          tools: [{ googleSearch: {} }],
        },
        contents: [
          { role: 'user', parts: [{ text: input }] }
        ],
      });

      // Log para diagnóstico de truncamento
      if (response.usageMetadata) {
        console.log(`[AIEngine] Tokens: Prompt=${response.usageMetadata.promptTokenCount}, Out=${response.usageMetadata.candidatesTokenCount}`);
      }

      let finalRawText = response.text || 'Não consegui formular uma resposta.';
      
      // Sanitização agressiva para remover blocos de "thought" que os modelos v3 as vezes vazam
      // Remove o bloco <thought> ... </thought> ou `thought\n...`
      finalRawText = finalRawText.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
      
      // Tratamento extra caso o Gemini formate de forma diferente
      if (finalRawText.toLowerCase().startsWith('thought')) {
        // Encontra onde termina a parte onde ele revisa e começa a resposta "final"
        const finalPolishMatch = finalRawText.match(/Final Polish:([\s\S]*)$/i);
        const revisedDraftMatch = finalRawText.match(/Revised Draft:([\s\S]*)$/i);
        if (finalPolishMatch && finalPolishMatch[1]) {
           finalRawText = finalPolishMatch[1].trim();
        } else if (revisedDraftMatch && revisedDraftMatch[1]) {
           finalRawText = revisedDraftMatch[1].trim();
        } else {
           // Fallback, corta as primeiras linhas que costumam ser o prompt vazado 
           const markerIndex = finalRawText.toLowerCase().indexOf('olá');
           if (markerIndex !== -1 && markerIndex < 1000) {
              finalRawText = finalRawText.substring(markerIndex).trim();
           }
        }
      }

      return finalRawText;
    } catch (error: any) {
      // FIX: Logar erro completo mas NÃO vazar detalhes da API ao usuário
      console.error('[AIEngine] Erro na chamada à API:', error.message, error.status || '');
      return 'Tive um pequeno contratempo na cozinha. Pode repetir?';
    }
  }
}
