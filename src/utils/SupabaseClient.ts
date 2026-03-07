import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * SupabaseClient.ts
 * O coração da persistência do ChefIA (God Mode).
 * 
 * Requer no .env:
 *   SUPABASE_URL
 *   SUPABASE_KEY (pode ser a anon ou service_role)
 */

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Credenciais não encontradas. O sistema pode falhar em operações de persistência.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // ChefIA é um robô, não precisa de sessão local de auth
  }
});

console.log('[Supabase] Cliente inicializado com sucesso.');
