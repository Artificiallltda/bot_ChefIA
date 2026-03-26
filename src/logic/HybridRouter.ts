import { ChatMessage } from './SessionManager';
import { AIEngine } from './AIEngine';
import { Anthropic } from '@anthropic-ai/sdk';

/**
 * HybridRouter.ts - Roteamento Inteligente Gemini ↔ Claude Sonnet 4.6
 * 
 * Estratégia:
 * - Consultas SIMPLES → Gemini 2.5 Flash (rápido, barato) - março 2026
 * - Consultas COMPLEXAS → Claude Sonnet 4.6 (preciso, técnico) - março 2026
 * 
 * Critérios de complexidade:
 * 1. Palavras-chave de técnica avançada
 * 2. Múltiplas variáveis/condições
 * 3. Receitas com mais de N ingredientes
 * 4. Perguntas sobre ciência dos alimentos
 * 5. Solicitações de precisão técnica
 * 
 * Modelos:
 * - Gemini: gemini-2.5-flash-preview-05-2026 (8192 tokens, 1M contexto)
 * - Claude: claude-sonnet-4-6-20260315 (8192 tokens, 200K contexto)
 */

export type ModelRoute = 'gemini' | 'claude';

export class HybridRouter {
  
  // Palavras que indicam ALTA complexidade (acionam Claude)
  private static readonly COMPLEX_KEYWORDS = [
    // Técnicas avançadas
    'fermentação', 'fermentacao', 'hidratação', 'hidratacao', 'autólise', 'autolise',
    'glúten', 'gluten', 'rede de glúten', 'desenvolvimento de glúten',
    'enzima', 'enzimático', 'enzimatica', 'protease', 'amilase',
    'reação de maillard', 'reacao de maillard', 'caramelização', 'caramelizacao',
    'emulsão', 'emulsao', 'emulsificante', 'lecitina',
    'temperagem', 'cristalização', 'cristalizacao', 'polimorfismo',
    'osmose', 'difusão', 'difusao', 'extração', 'extracao',
    
    // Ciência dos alimentos
    'ph', 'acidez', 'alcalino', 'bactéria', 'bacteria', 'levedura',
    'microbioma', 'probiótico', 'probiotico', 'prebiótico', 'prebiotico',
    'proteína', 'proteina', 'aminoácido', 'aminoacido', 'peptídeo', 'peptideo',
    'carboidrato', 'amido', 'gelatinização', 'gelatinizacao',
    
    // Precisão técnica
    'exato', 'preciso', 'científico', 'cientifico', 'técnico', 'tecnico',
    'porcentagem', 'percentual', 'proporção', 'proporcao', 'baker%',
    
    // Problemas complexos
    'não cresceu', 'não fermentou', 'ficou denso', 'ficou duro',
    'solução', 'problema', 'erro', 'falhou', 'deu errado'
  ];

  // Palavras que indicam BAIXA complexidade (Gemini)
  private static readonly SIMPLE_KEYWORDS = [
    'oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite',
    'obrigado', 'obrigada', 'valeu', 'brigado',
    'menu', 'ajuda', 'help', 'start', 'iniciar',
    'quanto', 'quanto tempo', 'quantos', 'qual', 'quais',
    'dica', 'dicas', 'sugestão', 'sugestao',
    'fácil', 'facil', 'rápido', 'rapido', 'simples',
    'básico', 'basico', 'iniciante', 'começar', 'comecando'
  ];

  // Padrões de receita complexa
  private static readonly COMPLEX_RECIPE_PATTERNS = [
    /receita.*pão.*artesanal/i,
    /receita.*sourdough/i,
    /receita.*levain/i,
    /receita.*fermento.*natural/i,
    /como fazer.*pão/i,
    /modo de preparo.*pão/i,
    /pão.*passo a passo/i,
    /pizza.*massa.*fermentação/i,
    /brioche/i,
    /croissant/i,
    /focaccia/i
  ];

  /**
   * Analisa a complexidade do input e retorna a rota adequada
   */
  static analyzeComplexity(input: string): { route: ModelRoute; reason: string; score: number } {
    const lower = input.toLowerCase();
    let score = 0;
    const reasons: string[] = [];

    // 1. Contar palavras-chave complexas
    const complexMatches = this.COMPLEX_KEYWORDS.filter(kw => lower.includes(kw));
    score += complexMatches.length * 2;
    if (complexMatches.length > 0) {
      reasons.push(`${complexMatches.length} termos técnicos: ${complexMatches.slice(0, 3).join(', ')}`);
    }

    // 2. Verificar padrões de receita complexa
    const recipeMatches = this.COMPLEX_RECIPE_PATTERNS.filter(pattern => pattern.test(input));
    score += recipeMatches.length * 3;
    if (recipeMatches.length > 0) {
      reasons.push('Receita complexa detectada');
    }

    // 3. Verificar se é pergunta técnica com múltiplas partes
    const hasMultipleQuestions = (input.match(/\?/g) || []).length > 1;
    if (hasMultipleQuestions) {
      score += 2;
      reasons.push('Múltiplas perguntas');
    }

    // 4. Verificar tamanho do input (inputs longos tendem a ser complexos)
    if (input.length > 200) {
      score += 1;
      reasons.push('Input longo');
    }

    // 5. Verificar números (receitas com medidas precisas)
    const hasNumbers = /\d+[\s,\.]*(gramas?|g\s|ml|colher| xíc| xíc\.|xícara|graus?|°c|°f|celsius|fahrenheit)/i.test(input);
    if (hasNumbers) {
      score += 2;
      reasons.push('Medidas precisas');
    }

    // 6. Reduzir score para saudações e perguntas simples
    const simpleMatches = this.SIMPLE_KEYWORDS.filter(kw => lower.includes(kw));
    if (simpleMatches.length > 0) {
      score -= simpleMatches.length * 2;
      reasons.push(`${simpleMatches.length} termos simples`);
    }

    // 7. Verificar se é continuação de conversa (menos contexto = mais complexo)
    // Isso é tratado externamente pelo histórico

    // Determinar rota baseada no score
    const threshold = 3; // Ajustável conforme necessidade
    const route: ModelRoute = score >= threshold ? 'claude' : 'gemini';

    return {
      route,
      reason: reasons.length > 0 ? reasons.join('; ') : 'Complexidade padrão',
      score
    };
  }

  /**
   * Gera resposta usando o modelo apropriado
   */
  static async generateResponse(
    userName: string,
    input: string,
    history: ChatMessage[] = [],
    forceModel?: 'gemini' | 'claude'
  ): Promise<string> {
    // Análise de complexidade
    const analysis = this.analyzeComplexity(input);
    
    // Determinar modelo final
    const selectedModel = forceModel || analysis.route;

    console.log(`[HybridRouter] Input: "${input.substring(0, 50)}..."`);
    console.log(`[HybridRouter] Complexidade: score=${analysis.score}, rota=${analysis.route}${forceModel ? ' (forçado)' : ''}`);
    console.log(`[HybridRouter] Razão: ${analysis.reason}`);

    // Log de métricas
    if (selectedModel === 'claude') {
      console.log(`[HybridRouter] 🎯 Claude acionado (alta complexidade)`);
    } else {
      console.log(`[HybridRouter] ⚡ Gemini acionado (baixa complexidade)`);
    }

    // Rotear para o modelo apropriado
    if (selectedModel === 'claude') {
      return this.callClaude(userName, input, history);
    } else {
      return AIEngine.generateResponse(userName, input, history);
    }
  }

  /**
   * Chama Claude para consultas complexas
   */
  private static async callClaude(
    userName: string,
    input: string,
    history: ChatMessage[]
  ): Promise<string> {
    try {
      // Verificar se API key está configurada
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('[HybridRouter] ANTHROPIC_API_KEY não configurada. Fallback para Gemini.');
        return AIEngine.generateResponse(userName, input, history);
      }

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      // Construir histórico formatado para Claude
      const messages = history.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));

      // System prompt otimizado para Claude
      const systemPrompt = `Você é o ChefIA, um mentor gastronômico virtual criado pela Artificiall LTDA.

## SUA ESPECIALIDADE
Você é ESPECIALISTA EM TÉCNICAS GASTRONÔMICAS AVANÇADAS e CIÊNCIA DOS ALIMENTOS.
Quando consultas complexas chegam até você, é porque exigem precisão técnica que outros modelos não conseguem fornecer.

## IDENTIDADE
- Chef experiente, caloroso e didático
- Especialista em panificação artesanal, sourdough e fermentação natural
- Conhecimento profundo de ciência dos alimentos
- O usuário se chama ${userName}

## COMPORTAMENTO PARA CONSULTAS COMPLEXAS
1. **SEJA PRECISO** - Use terminologia técnica correta quando apropriado
2. **EXPLIQUE O PORQUÊ** - Não apenas o "como", mas o "porquê" científico
3. **DÊ MEDIDAS EXATAS** - Gramas, porcentagens, temperaturas, tempos
4. **ANTICIPE PROBLEMAS** - Mencione erros comuns e como evitá-los
5. **CONTEXTUALIZE** - Relacione com princípios científicos quando relevante

## FORMATO PARA RECEITAS COMPLEXAS
- Título
- Ingredientes (com pesos em gramas e baker's % quando aplicável)
- Equipamentos necessários
- Cronograma (tempos de fermentação, temperaturas)
- Passo a passo numerado
- Pontos de atenção (o que observar em cada etapa)
- Solução de problemas (o que fazer se X acontecer)
- Ciência por trás (breve explicação do porquê cada etapa importa)

## REGRAS
- RESPONDA EM PORTUGUÊS DO BRASIL
- Use 1 asterisco para negrito quando destacar conceitos importantes
- Seja conciso mas completo
- Não use jargão excessivo sem explicar
- Nunca invente dados técnicos

---
HISTÓRICO DA CONVERSA:
${history.length > 0 ? history.map(m => `${m.role === 'user' ? 'Usuário' : 'ChefIA'}: ${m.content}`).join('\n') : 'Nenhuma mensagem anterior.'}`;

      // Chamar Claude Sonnet 4.6 (modelo mais recente - março 2026)
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6-20260315',
        max_tokens: 8192, // Sonnet 4.6 suporta até 16K tokens de output
        temperature: 0.4, // Ainda mais baixo para precisão técnica máxima
        system: systemPrompt,
        messages: [
          ...messages,
          { role: 'user', content: input }
        ]
      });

      // Extrair texto da resposta
      const textContent = response.content.find(block => block.type === 'text');
      const finalText = textContent?.text || 'Não consegui formular uma resposta.';

      console.log(`[HybridRouter] ✅ Claude respondeu (${response.usage.output_tokens} tokens)`);

      return finalText;

    } catch (error: any) {
      // Fallback para Gemini em caso de erro
      console.error('[HybridRouter] Erro Claude:', error.message);
      console.log('[HybridRouter] Fallback para Gemini');
      
      return AIEngine.generateResponse(userName, input, history);
    }
  }

  /**
   * Retorna estatísticas de uso dos modelos
   */
  static getUsageStats() {
    // Implementar tracking se necessário
    return {
      gemini_calls: 0,
      claude_calls: 0,
      fallback_count: 0
    };
  }
}
