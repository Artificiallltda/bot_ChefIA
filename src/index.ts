import * as dotenv from 'dotenv';
import http from 'http';
import { ChefRouter } from './logic/ChefRouter';
import { DatabaseUtils } from './utils/DatabaseUtils';

dotenv.config();

async function bootstrap() {
    console.log('????? ChefIA: Iniciando sistema...');
    
    // 1. Inicializa tabelas no startup
    const db = new DatabaseUtils();
    await db.initializeTables();
    
    // 2. Inicia o Bot
    const router = new ChefRouter();
    console.log('? ChefIA está online e pronto para cozinhar!');

    // 3. Mini HTTP Health Server para Docker/Railway
    const server = http.createServer((req, res) => {
        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
        console.log('?? Health server rodando na porta ' + PORT);
    });
}

bootstrap().catch(err => {
    console.error('? Falha crítica no bootstrap:', err);
    process.exit(1);
});
