import TelegramBot from 'node-telegram-bot-api';
import { IMessengerProvider, IncomingMessage, OutgoingMessage } from './IMessengerProvider';

/**
 * TelegramProvider.ts
 * Implementação real do provedor de mensageria para o Telegram.
 */
export class TelegramProvider implements IMessengerProvider {
  private bot: TelegramBot;
  private messageCallback?: (msg: IncomingMessage) => void;
  private errorCallback?: (error: Error) => void;

  constructor(private botToken: string) {
    this.bot = new TelegramBot(this.botToken, { polling: true });
    console.log(`[Telegram] Bot iniciado e ouvindo via Polling.`);
    this.setupListeners();
  }

  private setupListeners(): void {
    this.bot.on('message', (msg) => {
      if (!msg.text || !this.messageCallback) return;

      const incoming: IncomingMessage = {
        userId: msg.chat.id.toString(),
        userName: msg.from?.first_name || 'Usuário',
        text: msg.text,
        platform: 'Telegram'
      };

      this.messageCallback(incoming);
    });

    this.bot.on('polling_error', (error: any) => {
      console.error('[Telegram] Polling Error:', error.message);
      if (this.errorCallback) {
        this.errorCallback(error);
      }
    });
  }

  async sendMessage(message: OutgoingMessage): Promise<void> {
    try {
      await this.bot.sendMessage(message.to, message.text, { parse_mode: 'Markdown' });
      console.log(`[Telegram] Resposta enviada para ${message.to}`);
    } catch (error) {
      console.error(`[Telegram] Erro ao enviar mensagem para ${message.to}:`, error);
    }
  }

  onMessage(callback: (msg: IncomingMessage) => void): void {
    this.messageCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
}
