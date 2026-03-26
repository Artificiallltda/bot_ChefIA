import { ChatMessage } from './SessionManager';
import { ChefWriter } from './agents/ChefWriter';
import { Nutritionist } from './agents/Nutritionist';
import { SocialAgent } from './agents/SocialAgent';
import { HybridRouter } from './HybridRouter';

type Intent = 'tecnica' | 'nutricao' | 'social' | 'misto' | 'geral';

/**
 * AgentOrchestrator — O maestro invisível do ChefIA.
 *
 * Detecta a intenção da mensagem e delega para os agentes especializados certos.
 * O cliente no Telegram nunca vê os agentes — só recebe a resposta final unificada.
 *
 * Fluxo:
 *   Mensagem → detectIntent() → HybridRouter (Gemini/Claude) → resposta unificada
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
     * Detecta intenção e usa HybridRouter para escolher entre Gemini (básico) e Claude (complexo).
     */
    static async process(userName: string, input: string, history: ChatMessage[]): Promise<string> {
        const intent = this.detectIntent(input);
        console.log(`[Orchestrator] Intenção detectada: "${intent}" para: "${input.substring(0, 50)}..."`);

        // Para intenções especializadas, adicionamos contexto mas usamos HybridRouter
        let enrichedInput = input;
        
        if (intent === 'tecnica') {
            enrichedInput = `[CONTEXTO: Questão técnica de gastronomia. Use precisão técnica e explique a ciência por trás quando relevante.]\n\n${input}`;
        } else if (intent === 'nutricao') {
            enrichedInput = `[CONTEXTO: Questão de nutrição aplicada à gastronomia. Seja preciso com dados nutricionais e considere restrições alimentares.]\n\n${input}`;
        } else if (intent === 'social') {
            enrichedInput = `[CONTEXTO: Conteúdo para mídias sociais. Adapte o tom para ser engajante e use linguagem adequada para Instagram/TikTok.]\n\n${input}`;
        } else if (intent === 'misto') {
            const lower = input.toLowerCase();
            const isSocial = ['instagram', 'tiktok', 'post', 'legenda', 'reel', 'story', 'hashtag', 'conteúdo', 'conteudo'].some(k => lower.includes(k));
            const isNutri = ['caloria', 'macro', 'proteina', 'dieta', 'vegano', 'gluten', 'lactose', 'kcal', 'nutri'].some(k => lower.includes(k));

            let extraContext = "[CONTEXTO MISTO: ";
            if (isNutri && isSocial) {
                extraContext += "Mescle nutrição com criação de conteúdo social de forma engajante.";
            } else if (isNutri) {
                extraContext += "Una técnica gastronômica com nutrição de forma prática.";
            } else if (isSocial) {
                extraContext += "Adapte técnica gastronômica para formato de conteúdo social.";
            }
            extraContext += "]\n\n";
            enrichedInput = extraContext + input;
        }

        // Usar HybridRouter para todas as intenções (roteamento automático Gemini/Claude)
        console.log(`[Orchestrator] Encaminhando para HybridRouter...`);
        return HybridRouter.generateResponse(userName, enrichedInput, history);
    }
}
