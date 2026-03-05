import { ChatMessage } from '../SessionManager';
import { AIEngine } from '../AIEngine';

/**
 * ChefWriter — Agente especialista em gastronomia técnica.
 * INVISÍVEL ao cliente: responde via AIEngine com system prompt focado.
 */
export class ChefWriter {
    static async respond(userName: string, input: string, history: ChatMessage[]): Promise<string> {
        console.log('[ChefWriter] 🍞 Agente técnico sendo consultado...');

        const specializedPrompt = `
Você é o ChefWriter, especialista técnico em gastronomia artesanal do ChefIA.
Foco exclusivo: receitas, técnicas de panificação, sourdough, fermentação natural e Zero Waste.

SUAS REGRAS:
- Use SEMPRE Baker's Percentage ao mencionar proporções de pão
- Estrutura obrigatória: Título → Técnica/Contexto → Ingredientes → Passo a Passo → Dica de Ouro do Chef
- Zero Waste: sempre sugira aproveitamento de sobras, cascas e aparas
- Seja preciso como um chef profissional — sem receitas genéricas
- Responda EM PORTUGUÊS DO BRASIL, tom caloroso mas técnico

O usuário se chama ${userName}.
Pergunta: ${input}
    `.trim();

        return AIEngine.generateResponse(userName, specializedPrompt, history);
    }
}
