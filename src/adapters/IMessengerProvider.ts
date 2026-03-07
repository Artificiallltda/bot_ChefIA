/**
 * IMessengerProvider.ts
 * Interface universal para provedores de mensageria do ChefIA.
 */

export interface IncomingMessage {
  userId: string;
  userName: string;
  text: string;
  platform: 'WhatsApp' | 'Telegram';
  imageUrl?: string; // NOVO: Suporte a Visao do Chef
}

export interface OutgoingMessage {
  to: string;
  text: string;
}

export interface IMessengerProvider {
  sendMessage(message: OutgoingMessage): Promise<void>;
  onMessage(callback: (msg: IncomingMessage) => void): void;
}
