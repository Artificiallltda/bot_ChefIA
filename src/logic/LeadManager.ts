import { supabase } from '../utils/SupabaseClient';

export interface Lead {
  userId: string;
  userName: string;
  email?: string;
  phone?: string;
  platform: string;
  registeredAt: string;
}

export type StepType = 'START' | 'AWAITING_EMAIL' | 'AWAITING_PHONE' | 'REGISTERED';

export interface UserState {
  step: StepType;
}

/**
 * LeadManager (God Mode)
 * Gerencia o funil de cadastro e estados dos usuários no Supabase.
 */
export class LeadManager {
  
  static async getUserState(userId: string): Promise<UserState> {
    try {
      const { data, error } = await supabase
        .from('user_states')
        .select('step')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = Não encontrado
        console.error('[Supabase] Erro ao buscar estado:', error.message);
      }

      return { step: (data?.step as StepType) || 'START' };
    } catch (error) {
      console.error('[LeadManager] Falha crítica ao ler estado:', error);
      return { step: 'START' };
    }
  }

  static async setUserState(userId: string, state: { step: StepType }): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_states')
        .upsert({ user_id: userId, step: state.step }, { onConflict: 'user_id' });

      if (error) throw error;
      console.log(`[Supabase] Estado do usuário ${userId} atualizado: ${state.step}`);
    } catch (error: any) {
      console.error('[LeadManager] Falha crítica ao salvar estado:', error.message);
    }
  }

  static async addLead(userId: string, data: Partial<Lead>): Promise<void> {
    try {
      // Upsert: Insere ou atualiza os campos preenchidos
      const { error } = await supabase
        .from('leads')
        .upsert({
          user_id: userId,
          user_name: data.userName,
          email: data.email,
          phone: data.phone,
          platform: data.platform
        }, { onConflict: 'user_id' });

      if (error) throw error;
      console.log(`[Supabase] Lead ${userId} salvo com sucesso na nuvem.`);
    } catch (error: any) {
      console.error('[LeadManager] Falha crítica ao salvar lead:', error.message);
    }
  }
}
