import { IMessengerProvider, IncomingMessage, OutgoingMessage } from './IMessengerProvider';

/**
 * WhatsAppProvider.ts
 * v2.0.0 — Implementação real via Evolution API ou Twilio.
 *
 * Requer no .env:
 *   WHATSAPP_API_URL=https://sua-instancia.evolution-api.com
 *   WHATSAPP_API_KEY=sua_chave_aqui
 *   WHATSAPP_INSTANCE=nome-da-instancia
 */
export class WhatsAppProvider implements IMessengerProvider {
  private messageCallback?: (msg: IncomingMessage) => void;

  constructor(
    private apiUrl: string,
    private apiKey: string,
    private instance: string = 'default'
  ) {
    console.log(`[WhatsApp] Provider inicializado. Instância: ${this.instance}`);
  }

  /**
   * Envia mensagem via Evolution API (header apikey — seguro, nunca na URL).
   */
  async sendMessage(message: OutgoingMessage): Promise<void> {
    try {
      const endpoint = `${this.apiUrl}/message/sendText/${this.instance}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify({
          number: message.to,
          text: message.text
        })
      });

      if (!res.ok) {
        const err = await res.json() as any;
        console.error(`[WhatsApp] Falha ao enviar mensagem para ${message.to}:`, err);
      } else {
        console.log(`[WhatsApp] ✅ Mensagem enviada para ${message.to}`);
      }
    } catch (error: any) {
      console.error(`[WhatsApp] Erro de rede ao enviar mensagem:`, error.message);
    }
  }

  onMessage(callback: (msg: IncomingMessage) => void): void {
    this.messageCallback = callback;
    console.log('[WhatsApp] Aguardando webhooks de mensagens...');
  }

  onError(callback: (error: Error) => void): void {
    // WhatsApp usa webhooks — erros chegam via HTTP
  }

  /**
   * Processa um webhook recebido do WhatsApp (Evolution API format).
   * Chame este método no endpoint POST /whatsapp/webhook do servidor HTTP.
   */
  handleWebhook(body: any): void {
    if (!this.messageCallback) return;

    try {
      // Formato Evolution API
      const data = body?.data;
      if (!data || data.key?.fromMe) return; // Ignora mensagens próprias

      const userId = data.key?.remoteJid?.replace('@s.whatsapp.net', '') || 'unknown';
      const userName = data.pushName || data.key?.remoteJid || 'Usuário WhatsApp';
      const text = data.message?.conversation || data.message?.extendedTextMessage?.text || '';

      if (!text) return;

      this.messageCallback({
        userId,
        userName,
        text,
        platform: 'WhatsApp'
      });
    } catch (error: any) {
      console.error('[WhatsApp] Erro ao processar webhook:', error.message);
    }
  }
}
