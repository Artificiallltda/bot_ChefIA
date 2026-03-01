/**
 * ChefRouter.ts
 * O Maestro que conecta a voz (adapters) ao cerebro (logic).
 */

import { IncomingMessage } from '../adapters/IMessengerProvider';
import { AIEngine } from './AIEngine';
import { LeadManager } from './LeadManager';
import { SessionManager } from './SessionManager';

export class ChefRouter {
  /**
   * Processa a mensagem do usuario e retorna a resposta do mentor via IA,
   * garantindo que o usuario esteja registrado antes de liberar o acesso.
   */
  static async handleMessage(msg: IncomingMessage): Promise<string> {
    const userId = msg.userId;
    const input = msg.text.trim();

    // 0. Comandos de Reset
    if (input === '/reset_vendas') {
      await LeadManager.setUserState(userId, { step: 'START' });
      await SessionManager.clearSession(userId);
      return '** Sistema Resetado!** Seus dados de onboarding e historico de conversa foram limpos. Mande qualquer mensagem para iniciar do zero.';
    }

    if (input === '/reset_sessao') {
      await SessionManager.clearSession(userId);
      return '** Sessao Limpa!** Esqueci o que conversamos agora ha pouco, mas ainda lembro de voce. Como posso ajudar de novo?';
    }
    
    // 1. Verificar Estado do Registro (Lead Generation)
    const state = await LeadManager.getUserState(userId);

    // Fluxo de Cadastro Inicial
    if (state.step === 'START') {
      await LeadManager.setUserState(userId, { step: 'AWAITING_EMAIL' });
      return `Ola, ${msg.userName}! Sou o **ChefIA**, seu mentor de gastronomia.\n\nNotei que este e o seu primeiro acesso. Para liberar sua mentoria tecnica e acesso a minha base de receitas exclusivas, me diga o seu **melhor e-mail**:`;
    }

    if (state.step === 'AWAITING_EMAIL') {
      if (!input.includes('@') || !input.includes('.')) {
        return 'Ops! Esse e-mail parece estar com algum erro. Pode digitar novamente para eu garantir que seu acesso seja liberado?';
      }
      await LeadManager.addLead(userId, { email: input, userName: msg.userName, platform: msg.platform });
      await LeadManager.setUserState(userId, { step: 'AWAITING_PHONE' });
      return 'Perfeito! Agora, me diga seu **numero de celular** (com DDD) para que eu possa te enviar novidades e dicas exclusivas:';
    }

    if (state.step === 'AWAITING_PHONE') {
      const digits = input.replace(/\D/g, '');
      if (digits.length < 10) {
        return 'Poderia me enviar o numero com o DDD? Assim garantimos seu cadastro na nossa lista VIP de Chefs!';
      }
      await LeadManager.addLead(userId, { phone: input });
      await LeadManager.setUserState(userId, { step: 'REGISTERED' });
      return '** Parabens!** Seu acesso ao ChefIA esta oficialmente liberado.\n\nSou seu mentor em panificacao, nutricao e aproveitamento integral. Como posso ajudar na sua cozinha hoje?';
    }

    // 2. Se ja registrado, libera o cerebro total (IA) com Historico
    try {
      console.log(`[ChefRouter] Recuperando historico para ${msg.userName} (ID: ${userId})...`);
      const history = await SessionManager.getHistory(userId, 10);
      
      console.log(`[ChefRouter] Historico recuperado: ${history.length} mensagens.`);
      console.log(`[ChefRouter] Enviando para IA para ${msg.userName}: "${input}"`);
      
      const aiResponse = await AIEngine.generateResponse(msg.userName, input, history);

      // Salvar na sessao APOS a resposta ser gerada
      console.log(`[ChefRouter] Salvando interacao no banco...`);
      await SessionManager.addMessage(userId, 'user', input);
      await SessionManager.addMessage(userId, 'assistant', aiResponse);

      return aiResponse;
    } catch (error) {
      console.error('[ChefRouter] Erro critico no AIEngine:', error);
      return `Ola ${msg.userName}! Tive um breve colapso na cozinha (erro de conexao). Pode repetir sua pergunta em um instante?`;
    }
  }
}