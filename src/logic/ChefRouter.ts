/**
 * ChefRouter.ts
 * O Maestro que conecta a voz (adapters) ao cérebro (logic).
 * v2.0.0 — Comandos completos adicionados + fluxo de registro robusto.
 */

import { IncomingMessage } from '../adapters/IMessengerProvider';
import { AgentOrchestrator } from './AgentOrchestrator';
import { LeadManager } from './LeadManager';
import { SessionManager } from './SessionManager';
import { VisionEngine } from './VisionEngine';

const MENU_TEXT = `
🍳 *Menu do ChefIA*

Escolha um tema para começarmos:
• *Panificação* — Pães, sourdough, fermentos
• *Nutrição* — Ingredientes, substituições, macros
• *Zero Waste* — Aproveitamento integral, cascas, talos

Ou pergunte o que quiser diretamente!
`.trim();

const HELP_TEXT = `
📋 *Comandos disponíveis:*

/start — Iniciar ou reiniciar o bot
/menu — Ver opções de mentoria
/status — Ver seus dados de cadastro
/reset_sessao — Limpar histórico da conversa
/reset_vendas — Resetar seu cadastro completamente
/help — Exibir esta mensagem
`.trim();

export class ChefRouter {
  static async handleMessage(msg: IncomingMessage): Promise<string> {
    const userId = msg.userId;
    const input = msg.text.trim();

    console.log(`[ChefRouter] Processando mensagem de ${msg.userName} (Imagem: ${!!msg.imageUrl})`);

    // ── PRIORIDADE MÁXIMA: VISÃO DO CHEF ──────────────────────────────────────
    // Se enviou imagem, analisamos imediatamente independente do estado do lead.
    if (msg.imageUrl) {
      try {
        const history = await SessionManager.getHistory(userId, 5);
        const aiResponse = await VisionEngine.generateVisionResponse(msg.userName, input, msg.imageUrl, history);
        
        await SessionManager.addMessage(userId, 'user', input || '[Foto enviada]');
        await SessionManager.addMessage(userId, 'assistant', aiResponse);
        return aiResponse;
      } catch (error: any) {
        console.error('[ChefRouter] Erro crítico na visão:', error);
        return 'ChefIA: Desculpe, não consegui processar a sua imagem agora (Erro de Conexão). Pode descrevê-la para mim?';
      }
    }

    // ── Comandos globais (funcionam em qualquer estado) ──────────────────────
    if (input === '/start' || input === '/start@ChefIABot') {
      await LeadManager.setUserState(userId, { step: 'START' });
      await SessionManager.clearSession(userId);
      return `Olá, ${msg.userName}! Sou o *ChefIA*, seu mentor gastronômico especializado em Panificação, Nutrição e Zero Waste.\n\n${HELP_TEXT}`;
    }

    if (input === '/help' || input === '/help@ChefIABot') {
      return HELP_TEXT;
    }

    if (input === '/menu' || input === '/menu@ChefIABot') {
      return MENU_TEXT;
    }

    if (input === '/status' || input === '/status@ChefIABot') {
      const state = await LeadManager.getUserState(userId);
      if (state.step !== 'REGISTERED') {
        return '⚠️ Você ainda não concluiu seu cadastro. Mande qualquer mensagem para começar!';
      }
      // Busca dados do lead (simplificado — exibe estado atual)
      return `✅ *Seu status no ChefIA*\n\n👤 Nome: ${msg.userName}\n📱 Plataforma: ${msg.platform}\n🔐 Acesso: Liberado\n\nDigite sua dúvida gastronômica!`;
    }

    if (input === '/reset_vendas') {
      await LeadManager.setUserState(userId, { step: 'START' });
      await SessionManager.clearSession(userId);
      return '🔄 *Sistema Resetado!* Seus dados de cadastro e histórico foram limpos. Mande qualquer mensagem para iniciar do zero.';
    }

    if (input === '/reset_sessao') {
      await SessionManager.clearSession(userId);
      return '🧹 *Sessão Limpa!* Esqueci nossa conversa recente, mas ainda lembro de você. Como posso ajudar?';
    }

    // ── Fluxo de Cadastro ────────────────────────────────────────────────────
    const state = await LeadManager.getUserState(userId);

    if (state.step === 'START') {
      await LeadManager.setUserState(userId, { step: 'AWAITING_EMAIL' });
      return `Olá, ${msg.userName}! Sou o *ChefIA*, seu mentor de gastronomia.\n\nNão te vi antes por aqui! Para liberar sua mentoria técnica, me diga o seu *melhor e-mail*:`;
    }

    if (state.step === 'AWAITING_EMAIL') {
      if (!input.includes('@') || !input.includes('.')) {
        return '⚠️ Esse e-mail parece estar incorreto. Pode digitar novamente?';
      }
      await LeadManager.addLead(userId, { email: input, userName: msg.userName, platform: msg.platform });
      await LeadManager.setUserState(userId, { step: 'AWAITING_PHONE' });
      return 'Perfeito! Agora me diga seu *número de celular* (com DDD):';
    }

    if (state.step === 'AWAITING_PHONE') {
      const digits = input.replace(/\D/g, '');
      if (digits.length < 10) {
        return '⚠️ Poderia me enviar o número com DDD? Ex: 41999991111';
      }
      await LeadManager.addLead(userId, { phone: input });
      await LeadManager.setUserState(userId, { step: 'REGISTERED' });
      return `✅ *Cadastro concluído!* Bem-vindo à mentoria do ChefIA, ${msg.userName}!\n\n${MENU_TEXT}`;
    }

    // ── IA (usuário já registrado) ────────────────────────────────────────────
    try {
      console.log(`[ChefRouter] Recuperando histórico para ${msg.userName} (ID: ${userId})...`);
      const history = await SessionManager.getHistory(userId, 10);
      console.log(`[ChefRouter] ${history.length} msgs no histórico. Enviando para IA...`);

      let aiResponse: string;

      if (msg.imageUrl) {
        console.log(`[ChefRouter] Imagem detectada. Acionando VisionEngine...`);
        aiResponse = await VisionEngine.generateVisionResponse(msg.userName, input, msg.imageUrl, history);
      } else {
        aiResponse = await AgentOrchestrator.process(msg.userName, input, history);
      }

      await SessionManager.addMessage(userId, 'user', input || '[Enviou uma Imagem]');
      await SessionManager.addMessage(userId, 'assistant', aiResponse);

      return aiResponse;
    } catch (error) {
      console.error('[ChefRouter] Erro crítico no AIEngine:', error);
      return `${msg.userName}, tive um breve colapso na cozinha (erro de conexão). Pode repetir sua pergunta em um instante?`;
    }
  }
}