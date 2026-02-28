# Code Review — ChefIA (Pós-Migração)

**Data:** 28/02/2026 | **Revisor:** Antigravity | **Arquivos:** 13 src + 3 tests + config

---

## Resumo Executivo

| Severidade | Contagem | Impacto |
|---|---|---|
| 🔴 Crítico | 2 | Crash ou vazamento |
| 🟠 Alto | 3 | Performance ou testes quebrados |
| 🟡 Médio | 4 | Funcionalidade incompleta |
| 🔵 Baixo | 3 | Boas práticas |

> [!NOTE]
> O código tem uma base **muito boa**: interfaces limpas, tipagem forte, engines de domínio bem separados (BreadMath, NutriEngine, ZeroWasteEngine), e testes unitários cobrindo a lógica de negócio. A arquitetura adapter/router/engine é sólida.

---

## 🔴 Críticos

### C1. `ChefRouter.ts` — Código duplicado e inalcançável (linhas 505-507)

> [!CAUTION]
> Há código **duplicado depois do `catch/return`** que nunca será executado. Provavelmente um erro de copiar/colar durante a migração.

```typescript
// Linhas 501-508
    } catch (error) {
      console.error('[ChefRouter] Erro crítico no AIEngine:', error);
      return `Olá ${msg.userName}! Tive um breve colapso...`;
    }
      console.error('[ChefRouter] Erro crítico no AIEngine:', error);  // ❌ Unreachable!
      return `Olá ${msg.userName}! Tive um breve colapso...`;         // ❌ Unreachable!
    }
  }
```

O TypeScript deveria reportar erro aqui (`error` não está definido fora do catch). Remova as linhas 505-507.

---

### C2. `.env.example` — Token REAL do Telegram exposto

> [!CAUTION]
> O `.env.example` contém um token de bot do Telegram que parece **real** (não é placeholder).

```
TELEGRAM_BOT_TOKEN=8090620084:AAH0A0O0IeAe8oNyf0K2L-wjA6Lim8w-LMo
```

Se esse token for real, **revogue imediatamente** via @BotFather. Substitua por:

```diff
-TELEGRAM_BOT_TOKEN=8090620084:AAH0A0O0IeAe8oNyf0K2L-wjA6Lim8w-LMo
+TELEGRAM_BOT_TOKEN=seu_telegram_bot_token_aqui
```

---

## 🟠 Altos

### A1. `DatabaseUtils.ts` — Nova conexão a cada query

```typescript
static async executeWithRetry(query: string, params: any[] = []): Promise<any> {
    for (let i = 0; i < retries; i++) {
      const client = new Client({...});  // ← Nova conexão TCP em cada chamada!
      await client.connect();
      const res = await client.query(query, params);
      await client.end();
```

Cada mensagem do Telegram executa ~4 queries sequenciais, cada uma abrindo/fechando conexão TCP+SSL com o Supabase. Use **connection pool**:

```diff
-import { Client } from 'pg';
+import { Pool } from 'pg';
+
+const pool = new Pool({
+  connectionString: process.env.DATABASE_URL,
+  ssl: { rejectUnauthorized: false },
+  max: 5,
+});
 
 static async executeWithRetry(query: string, params: any[] = []): Promise<any> {
-    const client = new Client({...});
-    await client.connect();
-    const res = await client.query(query, params);
-    await client.end();
+    const res = await pool.query(query, params);
     return res;
```

---

### A2. `AIEngine.ts` — Knowledge base lida do disco a cada mensagem

```typescript
static async generateResponse(...): Promise<string> {
    const knowledge = this.getKnowledgeContext();  // ← Lê TODOS os .md TODA vez
```

`getKnowledgeContext()` faz `fs.readdirSync` + `fs.readFileSync` em todos os arquivos de knowledge a cada mensagem processada. Com 15 arquivos, isso é lento e desnecessário.

```diff
+private static _knowledgeCache: string | null = null;
+
 private static getKnowledgeContext(): string {
+    if (this._knowledgeCache) return this._knowledgeCache;
     // ... ler arquivos ...
+    this._knowledgeCache = context;
     return context;
 }
```

---

### A3. `Router.test.ts` — Testes fazem chamadas reais ao DB e à API de IA

Os testes do Router chamam `ChefRouter.handleMessage` sem mocks, o que significa:
- Tenta conectar ao Supabase real (vai falhar sem `DATABASE_URL`)
- Tenta chamar OpenAI/Anthropic (vai falhar sem API key ou vai gastar créditos)

Esses testes precisam de mocks para `DatabaseUtils` e `AIEngine`.

---

## 🟡 Médios

### M1. `.env.example` — Falta `DATABASE_URL`

O código usa `process.env.DATABASE_URL` em `DatabaseUtils.ts`, mas o `.env.example` **não lista essa variável**. Adicionar:

```diff
+# PostgreSQL (Supabase)
+DATABASE_URL=postgresql://postgres:senha@db.xxxxx.supabase.co:5432/postgres
```

---

### M2. `LeadManager.ts` — Chama `initializeTables()` em toda leitura

```typescript
static async getUserState(userId: string): Promise<UserState> {
    await DatabaseUtils.initializeTables();  // ← CREATE TABLE IF NOT EXISTS a cada msg!
```

Mova para a inicialização do app (`index.ts`):

```diff
 // src/index.ts
+import { DatabaseUtils } from './logic/DatabaseUtils';
+
+await DatabaseUtils.initializeTables();
 console.log('✅ ChefIA está online!');
```

---

### M3. `Dockerfile` — `EXPOSE 3000` mas sem health endpoint

O Dockerfile expõe a porta 3000 para health checks, mas o app é um bot Telegram (polling) sem servidor HTTP. O health check do Railway vai falhar. Adicionar um mini HTTP server:

```typescript
// src/index.ts — adicionar no final
import http from 'http';
http.createServer((_, res) => {
  res.writeHead(200);
  res.end('OK');
}).listen(3000);
```

---

### M4. `WhatsAppProvider.ts` — Não integrado

O provider existe mas não é usado em nenhum lugar. O `index.ts` só inicializa o Telegram. Precisa de um webhook receiver (Express/Fastify) para funcionar.

---

## 🔵 Baixos

### B1. `console.log` em todo lugar

O projeto usa `console.log`/`console.error` sem estrutura. Para produção, recomendo um logger básico:

```typescript
// src/utils/logger.ts
export const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data ? JSON.stringify(data) : ''),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
};
```

---

### B2. `ZeroWasteEngine` — Lookup usa normalização frágil

```typescript
static getSuggestionsFor(itemName: string): ScrapSuggestion | undefined {
    const normalizedKey = itemName.toLowerCase().replace(/\s+/g, '');
    // Compara com keys como "SourdoughDiscard" → "sourdoughdiscard"
```

A concatenação `item.source + item.type` forma strings como `"PumpkinPeel"`. Funciona, mas é frágil — qualquer typo quebra. Um mapeamento por `type` seria mais robusto.

---

### B3. `IMessengerProvider.ts` — `onMessage` callback deveria ser `async`

```typescript
onMessage(callback: (msg: IncomingMessage) => void): void;
//                                            ^^^^ deveria ser Promise<void>
```

O `ChefRouter.handleMessage` é async, mas a interface declara `void`. Funciona (JS ignora Promises não-awaited), mas é tecnicamente incorreto.

---

## Ações Recomendadas (Prioridade)

| # | Ação | Impacto | Esforço |
|---|---|---|---|
| 1 | Remover código duplicado no `ChefRouter.ts` | 🔴 Compile error | 1 min |
| 2 | Revogar token e limpar `.env.example` | 🔴 Segurança | 2 min |
| 3 | Usar `Pool` ao invés de `Client` no DB | 🟠 Performance 4x | 5 min |
| 4 | Cachear knowledge base no `AIEngine` | 🟠 Performance | 3 min |
| 5 | Adicionar `DATABASE_URL` ao `.env.example` | 🟡 DX | 1 min |
| 6 | Mover `initializeTables` para startup | 🟡 Performance | 2 min |
| 7 | Adicionar health endpoint HTTP | 🟡 Deploy | 3 min |
| 8 | Mockar DB/AI nos testes do Router | 🟠 Testes quebrados | 10 min |
