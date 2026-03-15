import * as dotenv from 'dotenv';
import http from 'http';
import crypto from 'crypto';
import { TelegramProvider } from './adapters/TelegramProvider';
import { WhatsAppProvider } from './adapters/WhatsAppProvider';
import { ChefRouter } from './logic/ChefRouter';
import { AdminRouter } from './logic/AdminRouter';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('ERRO: Variavel TELEGRAM_BOT_TOKEN nao encontrada no .env');
  process.exit(1);
}

// WhatsApp é opcional — só ativa se as variáveis estiverem presentes
const whatsappUrl = process.env.WHATSAPP_API_URL;
const whatsappKey = process.env.WHATSAPP_API_KEY;
const whatsappInstance = process.env.WHATSAPP_INSTANCE || 'default';
const whatsappWebhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET || '';
let whatsapp: WhatsAppProvider | null = null;

// ── Rate Limiter por IP/usuário ──────────────────────────────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000;  // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 30;   // máximo de requisições por janela
const rateLimitMap = new Map<string, RateLimitEntry>();

// Limpeza periódica do rate limiter para evitar memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60_000); // Limpa a cada 5 minutos

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false; // Dentro do limite
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    return true; // Excedeu o limite
  }

  return false;
}

// ── Validação de assinatura do webhook WhatsApp ──────────────────────────────
function validateWebhookSignature(body: string, signature: string | undefined, secret: string): boolean {
  if (!secret) {
    // Se não há secret configurado, aceita (mas loga aviso)
    console.warn('[Webhook] WHATSAPP_WEBHOOK_SECRET não configurado — aceitando sem validação.');
    return true;
  }
  if (!signature) {
    return false;
  }
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const expected = hmac.digest('hex');
  // Comparação segura contra timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function bootstrap() {
  console.log('ChefIA: Iniciando sistema de mentoria...');

  // 2. Telegram Provider
  const telegram = new TelegramProvider(token!);

  telegram.onMessage(async (msg) => {
    console.log(`[${msg.platform}] Mensagem de ${msg.userName}: ${msg.text}`);

    // FIX: Rate limiting por usuário no Telegram
    if (checkRateLimit(`tg_${msg.userId}`)) {
      await telegram.sendMessage({ to: msg.userId, text: 'Você está enviando mensagens muito rápido. Aguarde um momento.' });
      return;
    }

    try {
      const response = await ChefRouter.handleMessage(msg);
      await telegram.sendMessage({ to: msg.userId, text: response });
    } catch (error: any) {
      // FIX: Tratar erros sem vazar detalhes ao usuário
      console.error(`[Telegram] Erro ao processar mensagem de ${msg.userId}:`, error);
      await telegram.sendMessage({ to: msg.userId, text: 'Desculpe, tive um problema técnico. Pode tentar de novo?' });
    }
  });

  telegram.onError((error: any) => {
    if (error.message && error.message.includes('409 Conflict')) {
      console.error('\nALERTA: ChefIA já está rodando em outro local. Feche a outra instância.\n');
    }
  });

  // 3. WhatsApp Provider (opcional)
  if (whatsappUrl && whatsappKey) {
    whatsapp = new WhatsAppProvider(whatsappUrl, whatsappKey, whatsappInstance);
    whatsapp.onMessage(async (msg) => {
      console.log(`[${msg.platform}] Mensagem de ${msg.userName}: ${msg.text}`);

      // FIX: Rate limiting por usuário no WhatsApp
      if (checkRateLimit(`wa_${msg.userId}`)) {
        await whatsapp!.sendMessage({ to: msg.userId, text: 'Você está enviando mensagens muito rápido. Aguarde um momento.' });
        return;
      }

      try {
        const response = await ChefRouter.handleMessage(msg);
        await whatsapp!.sendMessage({ to: msg.userId, text: response });
      } catch (error: any) {
        // FIX: Tratar erros sem vazar detalhes ao usuário
        console.error(`[WhatsApp] Erro ao processar mensagem de ${msg.userId}:`, error);
        await whatsapp!.sendMessage({ to: msg.userId, text: 'Desculpe, tive um problema técnico. Pode tentar de novo?' });
      }
    });
    console.log('[WhatsApp] Provider ativado com sucesso.');
  } else {
    console.log('[WhatsApp] Variáveis não encontradas — provider desativado.');
  }

  // 4. HTTP Server (Health + WhatsApp Webhook + Admin)
  const PORT = process.env.PORT || 3000;
  const server = http.createServer(async (req, res) => {
    const url = req.url || '/';
    const method = req.method || 'GET';
    const clientIp = req.socket.remoteAddress || 'unknown';

    // FIX: Rate limiting por IP nas rotas HTTP
    if (checkRateLimit(`http_${clientIp}`)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many requests. Try again later.' }));
      return;
    }

    // ── Health Check ──────────────────────────────────────────────────────
    if (url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        providers: {
          telegram: true,
          whatsapp: !!whatsapp
        }
      }));
      return;
    }

    // ── WhatsApp Webhook ──────────────────────────────────────────────────
    if (url === '/whatsapp/webhook' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          // FIX: Validação de assinatura do webhook
          const signature = req.headers['x-webhook-signature'] as string | undefined
            || req.headers['x-hub-signature-256'] as string | undefined;

          if (!validateWebhookSignature(body, signature, whatsappWebhookSecret)) {
            console.warn(`[Webhook] Assinatura inválida de ${clientIp}`);
            res.writeHead(401);
            res.end('Unauthorized');
            return;
          }

          const payload = JSON.parse(body);
          whatsapp?.handleWebhook(payload);
          res.writeHead(200);
          res.end('OK');
        } catch (error: any) {
          // FIX: Não vazar detalhes do erro na resposta HTTP
          console.error('[Webhook] Erro ao processar payload:', error.message);
          res.writeHead(400);
          res.end('Bad Request');
        }
      });
      return;
    }

    // ── Admin Routes ──────────────────────────────────────────────────────
    if (url.startsWith('/admin')) {
      await AdminRouter.handle(req, res);
      return;
    }

    // ── Default ───────────────────────────────────────────────────────────
    res.writeHead(200);
    res.end('ChefIA Online');
  });

  server.listen(PORT, () => {
    console.log(`[HTTP] Servidor rodando na porta ${PORT}`);
    if (whatsapp) console.log(`[HTTP] Webhook WhatsApp: POST /whatsapp/webhook`);
    console.log(`[HTTP] Admin: GET /admin/leads | GET /admin/stats`);
  });

  console.log('ChefIA está online e pronto para cozinhar!');
}

bootstrap().catch(err => {
  console.error('Falha crítica no bootstrap:', err);
  process.exit(1);
});
