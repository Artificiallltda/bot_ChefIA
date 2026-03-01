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
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    const model = process.env.AIOS_DEFAULT_MODEL || 'gpt-4o';

    if (!apiKey) {
      return 'Ops! Estou sem meu chapeu de chef agora (API Key nao configurada). Mas posso te dizer que um bom pao leva tempo e paciencia!';
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

--- CONHECIMENTO TECNICO ---
${knowledge}

--- REGRAS DE OURO ---
- Paes: Baker's Percentage (Formula do Padeiro).
- Zero Waste: Priorize aproveitamento integral.
- Estrutura: Titulo, Tecnica, Ingredientes e Passo a Passo.
- Fechamento: "Dica de Ouro do Chef".`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input }
    ];

    try {
      if (process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model.includes('claude') ? model : 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: input }]
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erro na API Anthropic:', errorData);
          return 'Tive um problema com meu mentor Anthropic. Pode tentar de novo?';
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