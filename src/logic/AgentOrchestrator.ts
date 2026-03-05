import { ChatMessage } from './SessionManager';
import { ChefWriter } from './agents/ChefWriter';
import { Nutritionist } from './agents/Nutritionist';
import { SocialAgent } from './agents/SocialAgent';
import { AIEngine } from './AIEngine';

type Intent = 'tecnica' | 'nutricao' | 'social' | 'misto' | 'geral';

/**
 * AgentOrchestrator — O maestro invisível do ChefIA.
 *
 * Detecta a intenção da mensagem e delega para os agentes especializados certos.
 * O cliente no Telegram nunca vê os agentes — só recebe a resposta final unificada.
 *
 * Fluxo:
 *   Mensagem → detectIntent() → agente(s) em paralelo → resposta unificada
 */
export class AgentOrchestrator {

    /**
     * Detecta a intenção da mensagem usando palavras-chave.
     * Usa IA como fallback para casos ambíguos.
     */
    static detectIntent(input: string): Intent {
        const lower = input.toLowerCase();

        // Palavras que indicam conteúdo social
        const socialKeywords = ['instagram', 'tiktok', 'post', 'legenda', 'reel', 'story', 'hashtag', 'conteúdo', 'conteudo', 'publicar', 'feed'];
        // Palavras que indicam nutrição
        const nutriKeywords = ['caloria', 'macro', 'proteina', 'proteína', 'carboidrato', 'gordura', 'dieta', 'vegano', 'vegana', 'glúten', 'gluten', 'sem gluten', 'sem glúten', 'lactose', 'diabético', 'diabetico', 'emagrecer', 'low carb', 'nutrição', 'nutricao', 'saudável', 'saudavel', 'kcal'];
        // Palavras que indicam técnica gastronômica
        const tecnicaKeywords = ['receita', 'pão', 'pao', 'sourdough', 'levain', 'fermento', 'massa', 'forno', 'assar', 'temperatura', 'hidratação', 'hidratacao', 'baker', 'farinha', 'fermentação', 'fermentacao'];

        const isSocial = socialKeywords.some(k => lower.includes(k));
        const isNutri = nutriKeywords.some(k => lower.includes(k));
        const isTecnica = tecnicaKeywords.some(k => lower.includes(k));

        // Combinações
        if (isSocial && (isTecnica || isNutri)) return 'misto';
        if (isNutri && isTecnica) return 'misto';
        if (isSocial) return 'social';
        if (isNutri) return 'nutricao';
        if (isTecnica) return 'tecnica';

        return 'geral';
    }

    /**
     * Ponto de entrada principal.
     * Detecta intenção e aciona os agentes certos em paralelo.
     */
    static async process(userName: string, input: string, history: ChatMessage[]): Promise<string> {
        const intent = this.detectIntent(input);
        console.log(`[Orchestrator] Intenção detectada: "${intent}" para: "${input.substring(0, 50)}..."`);

        switch (intent) {
            case 'tecnica':
                return ChefWriter.respond(userName, input, history);

            case 'nutricao':
                return Nutritionist.respond(userName, input, history);

            case 'social':
                return SocialAgent.respond(userName, input, history);

            case 'misto': {
                // Dois ou mais agentes trabalham em paralelo
                console.log('[Orchestrator] Acionando múltiplos agentes em paralelo...');

                const lower = input.toLowerCase();
                const isSocial = ['instagram', 'tiktok', 'post', 'legenda', 'reel', 'story', 'hashtag', 'conteúdo', 'conteudo'].some(k => lower.includes(k));
                const isNutri = ['caloria', 'macro', 'proteina', 'dieta', 'vegano', 'gluten', 'lactose', 'kcal', 'nutri'].some(k => lower.includes(k));

                const promises: Promise<string>[] = [];
                const labels: string[] = [];

                // Sempre inclui ChefWriter no misto (base técnica)
                promises.push(ChefWriter.respond(userName, input, history));
                labels.push('🍞 Técnica');

                if (isNutri) {
                    promises.push(Nutritionist.respond(userName, `Informações nutricionais sobre: ${input}`, history));
                    labels.push('🥗 Nutrição');
                }

                if (isSocial) {
                    promises.push(SocialAgent.respond(userName, `Crie conteúdo para redes sociais sobre: ${input}`, history));
                    labels.push('📱 Conteúdo Social');
                }

                const results = await Promise.all(promises);

                // Une as respostas com separadores visuais
                return results.map((r, i) => `*${labels[i]}*\n${r}`).join('\n\n---\n\n');
            }

            default:
                // Resposta geral — usa AIEngine padrão sem especialização
                console.log('[Orchestrator] Resposta geral acionada.');
                return AIEngine.generateResponse(userName, input, history);
        }
    }
}
