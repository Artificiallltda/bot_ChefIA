import { IMessengerProvider, IncomingMessage, OutgoingMessage } from './IMessengerProvider';

/**
 * WhatsAppProvider.ts
 * Implementação do provedor de mensageria para o WhatsApp.
 * Preparado para Evolution API ou Twilio Webhooks.
 */
export class WhatsAppProvider implements IMessengerProvider {
  private messageCallback?: (msg: IncomingMessage) => void;

  constructor(private apiEndpoint: string, private apiKey: string) {
    console.log(`[WhatsApp] Inicializado com endpoint: ${this.apiEndpoint}`);
  }

  async sendMessage(message: OutgoingMessage): Promise<void> {
    console.log(`[WhatsApp] Enviando para ${message.to}: ${message.text}`);
    // No mundo real: await axios.post(`${this.apiEndpoint}/message`, { to: message.to, text: message.text }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
  }

  onMessage(callback: (msg: IncomingMessage) => void): void {
    this.messageCallback = callback;
    console.log('[WhatsApp] Ouvindo webhooks de mensagens...');
  }

  /**
   * Simula o recebimento de uma mensagem vinda do webhook.
   */
  handleWebhook(userId: string, userName: string, text: string): void {
    if (this.messageCallback) {
      this.messageCallback({
        userId,
        userName,
        text,
        platform: 'WhatsApp'
      });
    }
  }
}
