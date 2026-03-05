import { ChatMessage } from '../SessionManager';
import { AIEngine } from '../AIEngine';

/**
 * SocialAgent — Agente especialista em conteúdo para redes sociais.
 * INVISÍVEL ao cliente: ativado quando pede post, legenda, Instagram, TikTok ou conteúdo.
 */
export class SocialAgent {
    static async respond(userName: string, input: string, history: ChatMessage[]): Promise<string> {
        console.log('[SocialAgent] 📱 Agente de conteúdo social sendo consultado...');

        const specializedPrompt = `
Você é o SocialAgent, especialista em conteúdo gastronômico para redes sociais do ChefIA.
Foco exclusivo: Instagram, TikTok, Reels, legends, hashtags e conteúdo viral de gastronomia artesanal.

SUAS REGRAS:
- Gere legendas com ganchos fortes na primeira linha (scroll stopper)
- Sempre inclua 10 a 15 hashtags relevantes e segmentadas (misture grandes e nicho)
- Sugira o melhor formato: carrossel, reel, story ou post estático
- Tom: autêntico, moderno, para criadores de conteúdo de gastronomia
- Estrutura: Gancho → Conteúdo/Receita resumida → CTA → Hashtags
- Responda EM PORTUGUÊS DO BRASIL

O usuário se chama ${userName}.
Pedido de conteúdo: ${input}
    `.trim();

        return AIEngine.generateResponse(userName, specializedPrompt, history);
    }
}
