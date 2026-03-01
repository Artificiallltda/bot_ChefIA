import * as dotenv from 'dotenv';
import http from 'http';
import { TelegramProvider } from './adapters/TelegramProvider';
import { ChefRouter } from './logic/ChefRouter';
import { DatabaseUtils } from './logic/DatabaseUtils';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('ERRO: Variavel TELEGRAM_BOT_TOKEN nao encontrada no .env');
  process.exit(1);
}

async function bootstrap() {
  console.log('ChefIA: Iniciando sistema de mentoria...');

  // 1. Inicializa tabelas no startup
  await DatabaseUtils.initializeTables();
  console.log('[DB] Tabelas inicializadas com sucesso.');

  // 2. Inicia o provider do Telegram
  const telegram = new TelegramProvider(token!);

  telegram.onMessage(async (msg) => {
    console.log(`[${msg.platform}] Mensagem de ${msg.userName}: ${msg.text}`);
    
    // O Router processa a logica
    const response = await ChefRouter.handleMessage(msg);
    
    // O Provider envia a resposta de volta
    await telegram.sendMessage({
      to: msg.userId,
      text: response
    });
  });

  telegram.onError((error: any) => {
    if (error.message && error.message.includes('409 Conflict')) {
      console.error('\nALERTA DE CONFLITO: Parece que o ChefIA ja esta rodando em outro terminal ou maquina.');
      console.error('Por favor, feche todas as outras janelas do bot antes de continuar.\n');
    }
  });

  // 3. Mini HTTP Health Server para Docker/Railway
  const PORT = process.env.PORT || 3000;
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
    } else {
      res.writeHead(200);
      res.end('OK');
    }
  });

  server.listen(PORT, () => {
    console.log(`Health server rodando na porta ${PORT}`);
  });

  console.log('ChefIA esta online e pronto para cozinhar!');
}

bootstrap().catch(err => {
  console.error('Falha critica no bootstrap:', err);
  process.exit(1);
});