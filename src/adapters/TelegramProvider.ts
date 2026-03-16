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
    this.bot.on('message', async (msg) => {
      if (!this.messageCallback) return;

      let text = msg.text || msg.caption || '';
      let imageUrl: string | undefined;

      // Se houver uma foto na mensagem, pegamos a de maior resolução (última do array)
      if (msg.photo && msg.photo.length > 0) {
        const highestResPhoto = msg.photo[msg.photo.length - 1];
        try {
          imageUrl = await this.bot.getFileLink(highestResPhoto.file_id);
          console.log(`[Telegram] Foto recebida, url temporária obtida.`);
        } catch (error) {
          console.error(`[Telegram] Falha ao obter link da foto:`, error);
        }
      }

      // Se não tem texto e nem imagem, ignora (ex: stickers, áudios não suportados ainda)
      if (!text && !imageUrl) return;

      const incoming: IncomingMessage = {
        userId: msg.chat.id.toString(),
        userName: msg.from?.first_name || 'Usuário',
        text: text,
        platform: 'Telegram',
        imageUrl: imageUrl
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
      // Tenta enviar com formatação Markdown
      await this.bot.sendMessage(message.to, message.text, { parse_mode: 'Markdown' });
      console.log(`[Telegram] Resposta enviada para ${message.to}`);
    } catch (error: any) {
      if (error.message && error.message.includes('parse entities')) {
        console.warn(`[Telegram] Erro de formatação Markdown. Tentando enviar como texto puro para ${message.to}...`);
        try {
          // Fallback: envia sem parse_mode se o markdown do LLM estiver quebrado
          await this.bot.sendMessage(message.to, message.text);
          console.log(`[Telegram] Resposta enviada (texto puro) para ${message.to}`);
        } catch (fallbackError) {
          console.error(`[Telegram] Erro crítico ao enviar mensagem para ${message.to}:`, fallbackError);
        }
      } else {
        console.error(`[Telegram] Erro ao enviar mensagem para ${message.to}:`, error);
      }
    }
  }

  onMessage(callback: (msg: IncomingMessage) => void): void {
    this.messageCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
}
