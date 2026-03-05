import { IncomingMessage, ServerResponse } from 'http';
import { DatabaseUtils } from './DatabaseUtils';

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
                const result = await DatabaseUtils.executeWithRetry(
                    'SELECT user_id, user_name, email, phone, platform, registered_at FROM leads ORDER BY registered_at DESC',
                    []
                );
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    total: result.rows.length,
                    leads: result.rows
                }));
            } catch (error: any) {
                console.error('[Admin] Erro ao buscar leads:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Erro ao consultar o banco.' }));
            }
            return;
        }

        // ── GET /admin/stats ────────────────────────────────────────────────────
        if (url === '/admin/stats' && req.method === 'GET') {
            try {
                const [leadsRes, msgsRes] = await Promise.all([
                    DatabaseUtils.executeWithRetry('SELECT COUNT(*) as total FROM leads', []),
                    DatabaseUtils.executeWithRetry('SELECT COUNT(*) as total FROM messages', [])
                ]);

                const totalLeads = parseInt(leadsRes.rows[0]?.total || '0');
                const totalMsgs = parseInt(msgsRes.rows[0]?.total || '0');

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
                res.end(JSON.stringify({ error: 'Erro ao consultar o banco.' }));
            }
            return;
        }

        // ── 404 ─────────────────────────────────────────────────────────────────
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Rota admin não encontrada.', rotas: ['/admin/leads', '/admin/stats'] }));
    }
}
