import { DatabaseUtils } from './DatabaseUtils';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * SessionManager.ts
 * Gerencia o histórico de conversas de cada usuário de forma persistente.
 */
export class SessionManager {
  /**
   * Adiciona uma mensagem ao histórico do usuário no PostgreSQL.
   */
  static async addMessage(userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    try {
      await DatabaseUtils.executeWithRetry(
        'INSERT INTO messages (user_id, role, content) VALUES ($1, $2, $3)',
        [userId, role, content]
      );
    } catch (error) {
      console.error('[SessionManager] Erro ao salvar mensagem:', error);
    }
  }

  /**
   * Recupera o histórico das últimas mensagens do usuário.
   */
  static async getHistory(userId: string, limit = 10): Promise<ChatMessage[]> {
    try {
      await DatabaseUtils.initializeTables();
      const res = await DatabaseUtils.executeWithRetry(
        'SELECT role, content FROM messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
        [userId, limit]
      );
      
      // Reverter para ordem cronológica (SELECT pegou os mais recentes primeiro)
      return res.rows.reverse().map((row: any) => ({
        role: row.role as 'user' | 'assistant',
        content: row.content
      }));
    } catch (error) {
      console.error('[SessionManager] Erro ao recuperar histórico:', error);
      return [];
    }
  }

  /**
   * Limpa o histórico de um usuário (ex: comando /reset).
   */
  static async clearSession(userId: string): Promise<void> {
    try {
      await DatabaseUtils.executeWithRetry('DELETE FROM messages WHERE user_id = $1', [userId]);
    } catch (error) {
      console.error('[SessionManager] Erro ao limpar sessão:', error);
    }
  }
}
