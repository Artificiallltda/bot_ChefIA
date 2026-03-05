import * as fs from 'fs';
import * as path from 'path';
import { ChatMessage } from './SessionManager';

export class AIEngine {
  private static KNOWLEDGE_DIR = path.join(__dirname, '..', '..', 'knowledge');
  private static _knowledgeCache: string | null = null;

  private static getKnowledgeContext(): string {
    if (this._knowledgeCache) return this._knowledgeCache;
    try {
      if (!fs.existsSync(this.KNOWLEDGE_DIR)) return '';
      const files = fs.readdirSync(this.KNOWLEDGE_DIR);
      let context = '--- CONHECIMENTO TECNICO DO CHEFIA ---\n';
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = fs.readFileSync(path.join(this.KNOWLEDGE_DIR, file), 'utf-8');
          context += `\n### Documento: ${file}\n${content}\n`;
        }
      }
      context += '\n--- FIM DO CONHECIMENTO ---\n';
      this._knowledgeCache = context;
      return context;
    } catch (error) {
      console.error('Erro ao ler base de conhecimento:', error);
      return '';
    }
  }

  static async generateResponse(userName: string, input: string, history: ChatMessage[] = []): Promise<string> {
    const model = process.env.AIOS_DEFAULT_MODEL || 'gpt-4o';

    // Seletor explícito: baseia-se no nome do modelo, não na presença das chaves
    const useAnthropic = model.toLowerCase().includes('claude');
    const apiKey = useAnthropic
      ? process.env.ANTHROPIC_API_KEY
      : process.env.OPENAI_API_KEY;

    console.log(`[AIEngine] Provider selecionado: ${useAnthropic ? 'Anthropic' : 'OpenAI'} | Modelo: ${model}`);

    if (!apiKey) {
      const missing = useAnthropic ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
      console.error(`[AIEngine] Variável ${missing} não encontrada no .env`);
      return 'Ops! Estou sem meu chapéu de chef agora (API Key não configurada). Verifique o .env do servidor.';
    }

    const knowledge = this.getKnowledgeContext();
    const historyText = history.length > 0
      ? history.map(m => `${m.role === 'user' ? 'Usuario' : 'ChefIA'}: ${m.content}`).join('\n')
      : 'Nenhuma mensagem anterior.';

    const systemPrompt = `Voce e o ChefIA, um Mentor Gastronomico e Chef especializado em Panificacao Artesanal (Sourdough), Nutricao Consciente e Aproveitamento Integral (Zero Waste).

--- DIRETRIZES DE PERSONA E MEMORIA ---
1. O usuario se chama ${userName}. 
2. MEMORIA ATIVA: Voce tem acesso ao historico das ultimas mensagens abaixo. Use-o para manter a continuidade.
3. FLUIDEZ EXTREMA: NAO diga "Ola ${userName}" a menos que seja a primeira interacao absoluta do dia. Seja direto, como um Chef em servico.
4. RESPONDA SEMPRE EM PORTUGUES DO BRASIL.

--- HISTORICO ---
${historyText}

--- REGRAS DE COMUNICAÇÃO (PERSONAL CHEF) ---
- TOM E FLUIDEZ: Você está conversando num app de mensagens. Seja conciso, humano e vá direto ao ponto. NUNCA envie "textões" a menos que esteja passando uma receita do zero.
- DÚVIDAS E SUBSTITUIÇÕES: Se o usuário pedir para trocar um ingrediente ou tirar uma dúvida rápida, responda em 1 ou 2 parágrafos curtos. MANTENHA O FOCO na receita ou assunto atual da conversa.
- RECEITAS NOVAS: APENAS quando for pedido uma receita completa, use a estrutura: Nome do Prato, Ingredientes, Passo a Passo e finalize com a "Dica de Ouro do Chef".
- ZERO WASTE & BAKER'S PERCENTAGE: Mencione essas técnicas com naturalidade dentro do contexto, quando fizer sentido, sem forçar o jargão a todo momento.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input }
    ];

    try {
      if (useAnthropic) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model,
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: input }]
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('[AIEngine] Erro na API Anthropic:', errorData);
          return 'Tive um problema com meu mentor de IA. Pode tentar de novo em instantes?';
        }

        const data: any = await response.json();
        return data.content[0].text;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model.includes('gpt') ? model : 'gpt-4o',
          messages: messages,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro na API de IA:', errorData);
        return 'Tive um pequeno contratempo na cozinha (Erro na API). Pode repetir a pergunta?';
      }

      const data: any = await response.json();
      return data.choices[0].message.content;

    } catch (error) {
      console.error('Erro ao gerar resposta de IA:', error);
      return 'Houve um erro tecnico ao processar sua resposta. Vamos tentar de novo?';
    }
  }
}