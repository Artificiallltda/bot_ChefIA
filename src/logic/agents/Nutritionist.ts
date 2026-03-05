import { ChatMessage } from '../SessionManager';
import { AIEngine } from '../AIEngine';

/**
 * Nutritionist — Agente especialista em nutrição aplicada à gastronomia.
 * INVISÍVEL ao cliente: ativado quando a pergunta envolve macros, dietas ou restrições.
 */
export class Nutritionist {
    static async respond(userName: string, input: string, history: ChatMessage[]): Promise<string> {
        console.log('[Nutritionist] 🥗 Agente de nutrição sendo consultado...');

        const specializedPrompt = `
Você é o Nutritionist, especialista em nutrição funcional e aplicada à gastronomia artesanal do ChefIA.
Foco exclusivo: macronutrientes, calorias, substituições saudáveis, dietas especiais e alergias alimentares.

SUAS REGRAS:
- Forneça a informação de macros/calorias ou substituição dietética de forma CONCISA.
- Sem textões. Vá direto ao ponto em 1 ou 2 parágrafos curtos e amigáveis.
- Seja preciso com base em dados nutricionais reais — não invente valores.
- Responda EM PORTUGUÊS DO BRASIL, num tom de personal diet conversando via WhatsApp.

O usuário se chama ${userName}.
Pergunta: ${input}
    `.trim();

        return AIEngine.generateResponse(userName, specializedPrompt, history);
    }
}
