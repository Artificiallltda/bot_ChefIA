import { supabase } from '../utils/SupabaseClient';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * SessionManager.ts (God Mode)
 * Gerencia o histórico de conversas de cada usuário de forma persistente no Supabase.
 */
export class SessionManager {
  
  /**
   * Adiciona uma mensagem ao histórico do usuário no Supabase.
   */
  static async addMessage(userId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          role,
          content
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('[SessionManager] Erro ao salvar mensagem:', error.message);
    }
  }

  /**
   * Recupera o histórico das últimas mensagens do usuário.
   */
  static async getHistory(userId: string, limit = 10): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Reverter para ordem cronológica (SELECT pegou os mais recentes primeiro)
      return (data || []).reverse().map((row: any) => ({
        role: row.role as 'user' | 'assistant',
        content: row.content
      }));
    } catch (error: any) {
      console.error('[SessionManager] Erro ao recuperar histórico:', error.message);
      return [];
    }
  }

  /**
   * Limpa o histórico de um usuário (ex: comando /reset).
   */
  static async clearSession(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      console.log(`[Supabase] Sessão do usuário ${userId} limpa com sucesso.`);
    } catch (error: any) {
      console.error('[SessionManager] Erro ao limpar sessão:', error.message);
    }
  }
}
