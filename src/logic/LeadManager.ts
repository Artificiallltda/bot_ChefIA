import { DatabaseUtils } from './DatabaseUtils';

export interface Lead {
  userId: string;
  userName: string;
  email?: string;
  phone?: string;
  platform: string;
  registeredAt: string;
}

export interface UserState {
  step: 'START' | 'AWAITING_EMAIL' | 'AWAITING_PHONE' | 'REGISTERED';
}

export class LeadManager {
  static async getUserState(userId: string): Promise<UserState> {
    try {
      await DatabaseUtils.initializeTables();
      const res = await DatabaseUtils.executeWithRetry('SELECT step FROM user_states WHERE user_id = $1', [userId]);
      const step = res.rows[0]?.step || 'START';
      return { step } as UserState;
    } catch (error) {
      console.error('[DB] Falha crítica ao ler estado:', error);
      return { step: 'START' };
    }
  }

  static async setUserState(userId: string, state: UserState): Promise<void> {
    try {
      await DatabaseUtils.executeWithRetry(
        'INSERT INTO user_states (user_id, step) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET step = $2',
        [userId, state.step]
      );
      console.log(`[DB] Estado atualizado: ${state.step}`);
    } catch (error) {
      console.error('[DB] Falha crítica ao salvar estado:', error);
    }
  }

  static async addLead(userId: string, data: Partial<Lead>): Promise<void> {
    try {
      await DatabaseUtils.executeWithRetry(
        'INSERT INTO leads (user_id, user_name, email, phone, platform) VALUES ($1, $2, $3, $4, $5) ' +
        'ON CONFLICT (user_id) DO UPDATE SET email = COALESCE($3, leads.email), phone = COALESCE($4, leads.phone), user_name = $2',
        [userId, data.userName || 'Usuário', data.email || null, data.phone || null, data.platform || 'Telegram']
      );
      console.log(`[DB] Lead salvo no banco profissional.`);
    } catch (error) {
      console.error('[DB] Falha crítica ao salvar lead:', error);
    }
  }
}
