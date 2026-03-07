import { IncomingMessage, ServerResponse } from 'http';
import { supabase } from '../utils/SupabaseClient';

/**
 * AdminRouter.ts
 * Endpoints HTTP de administração protegidos por ADMIN_SECRET.
 *
 * GET /admin/leads  — Lista todos os leads do Supabase
 * GET /admin/stats  — Totais: leads, mensagens
 */
export class AdminRouter {
    private static isAuthorized(req: IncomingMessage): boolean {
        const secret = process.env.ADMIN_SECRET;
        if (!secret) {
            console.warn('[Admin] ADMIN_SECRET não configurado — acesso bloqueado.');
            return false;
        }
        const authHeader = req.headers['x-admin-secret'] || req.headers['authorization'];
        return authHeader === secret || authHeader === `Bearer ${secret}`;
    }

    static async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
        // Segurança: rejeita sem o header correto
        if (!AdminRouter.isAuthorized(req)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Unauthorized. Envie o header x-admin-secret.' }));
            return;
        }

        const url = req.url || '';

        // ── GET /admin/leads ────────────────────────────────────────────────────
        if (url === '/admin/leads' && req.method === 'GET') {
            try {
                const { data, error } = await supabase
                    .from('leads')
                    .select('user_id, user_name, email, phone, platform, registered_at')
                    .order('registered_at', { ascending: false });

                if (error) throw error;

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    total: data.length,
                    leads: data
                }));
            } catch (error: any) {
                console.error('[Admin] Erro ao buscar leads:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Erro ao consultar o banco no Supabase.' }));
            }
            return;
        }

        // ── GET /admin/stats ────────────────────────────────────────────────────
        if (url === '/admin/stats' && req.method === 'GET') {
            try {
                const [leadsCount, msgsCount] = await Promise.all([
                    supabase.from('leads').select('*', { count: 'exact', head: true }),
                    supabase.from('messages').select('*', { count: 'exact', head: true })
                ]);

                const totalLeads = leadsCount.count || 0;
                const totalMsgs = msgsCount.count || 0;

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    leads_cadastrados: totalLeads,
                    mensagens_trocadas: totalMsgs,
                    media_msgs_por_lead: totalLeads > 0 ? Math.round(totalMsgs / totalLeads) : 0,
                    timestamp: new Date().toISOString()
                }));
            } catch (error: any) {
                console.error('[Admin] Erro ao buscar stats:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Erro ao consultar o banco no Supabase.' }));
            }
            return;
        }

        // ── 404 ─────────────────────────────────────────────────────────────────
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Rota admin não encontrada.', rotas: ['/admin/leads', '/admin/stats'] }));
    }
}
