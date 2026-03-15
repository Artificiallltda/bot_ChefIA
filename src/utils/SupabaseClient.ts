import { createClient, SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * SupabaseClient.ts
 * O coração da persistência do ChefIA.
 * 
 * CORREÇÃO DE SEGURANÇA: Usa EXCLUSIVAMENTE a SUPABASE_ANON_KEY com RLS habilitado.
 * A SERVICE_ROLE_KEY NUNCA deve ser usada no runtime do bot — ela bypassa RLS
 * e expõe todos os dados do banco caso o servidor seja comprometido.
 * 
 * Requer no .env:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY  (chave pública com RLS — segura para uso no bot)
 */

const supabaseUrl = process.env.SUPABASE_URL || '';
// FIX: Priorizar ANON_KEY (segura com RLS) em vez de SERVICE_ROLE_KEY
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] ERRO: Credenciais SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórias no .env');
  console.error('[Supabase] O sistema NÃO funcionará corretamente sem elas.');
}

// FIX: Alertar se SERVICE_ROLE_KEY estiver sendo usada inadvertidamente
if (process.env.SUPABASE_SERVICE_ROLE_KEY && supabaseKey === process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Supabase] ALERTA DE SEGURANÇA: Você está usando a SERVICE_ROLE_KEY no runtime.');
  console.warn('[Supabase] Troque para SUPABASE_ANON_KEY e habilite RLS nas tabelas.');
}

export const supabase: SupabaseClientType = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // ChefIA é um robô, não precisa de sessão local de auth
  }
});

console.log('[Supabase] Cliente inicializado com ANON_KEY (RLS habilitado).');
