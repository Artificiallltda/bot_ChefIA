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

SUAS REGRAS ESPECÍFICAS DESTE TEMA:
- Use Baker's Percentage para proporções de pão quando pertinente.
- Zero Waste: sugira aproveitamento de sobras se houver oportunidade natural no prato.
- Foco absoluto no tema técnico perguntado na conversa atual.

O usuário se chama ${userName}.
Pergunta: ${input}
    `.trim();

        return AIEngine.generateResponse(userName, specializedPrompt, history);
    }
}
