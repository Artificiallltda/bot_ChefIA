import * as dotenv from 'dotenv';
import http from 'http';
import { TelegramProvider } from './adapters/TelegramProvider';
import { WhatsAppProvider } from './adapters/WhatsAppProvider';
import { ChefRouter } from './logic/ChefRouter';
import { DatabaseUtils } from './logic/DatabaseUtils';
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
let whatsapp: WhatsAppProvider | null = null;

async function bootstrap() {
  console.log('ChefIA: Iniciando sistema de mentoria...');

  // 1. Inicializa tabelas no startup
  await DatabaseUtils.initializeTables();
  console.log('[DB] Tabelas inicializadas com sucesso.');

  // 2. Telegram Provider
  const telegram = new TelegramProvider(token!);

  telegram.onMessage(async (msg) => {
    console.log(`[${msg.platform}] Mensagem de ${msg.userName}: ${msg.text}`);
    const response = await ChefRouter.handleMessage(msg);
    await telegram.sendMessage({ to: msg.userId, text: response });
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
      const response = await ChefRouter.handleMessage(msg);
      await whatsapp!.sendMessage({ to: msg.userId, text: response });
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
          const payload = JSON.parse(body);
          whatsapp?.handleWebhook(payload);
          res.writeHead(200);
          res.end('OK');
        } catch {
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