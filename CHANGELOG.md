# CHANGELOG - Auditoria de Segurança e Performance

Este documento detalha as correções críticas e melhorias de performance aplicadas ao bot ChefIA, com base na auditoria de código.

## v2.1.0 (2026-03-15)

### 🔒 Melhorias de Segurança

1.  **Supabase `SERVICE_ROLE_KEY` Removida do Runtime:**
    *   **Risco:** A chave de serviço (`SERVICE_ROLE_KEY`) estava sendo usada no runtime do bot. Se o servidor fosse comprometido, um invasor teria acesso irrestrito a todos os dados do banco, pois essa chave ignora todas as políticas de RLS (Row Level Security).
    *   **Correção:** O arquivo `src/utils/SupabaseClient.ts` foi modificado para usar **exclusivamente** a `SUPABASE_ANON_KEY`. O uso da chave de serviço agora é estritamente proibido no código do bot, e um alerta será logado caso ela seja detectada. A segurança agora depende da correta implementação de políticas de RLS nas tabelas do Supabase.

2.  **Validação de Assinatura do Webhook do WhatsApp:**
    *   **Risco:** O endpoint `/whatsapp/webhook` aceitava qualquer requisição POST, permitindo que qualquer pessoa na internet enviasse mensagens falsas para o bot, causando consumo de recursos e potenciais ataques.
    *   **Correção:** Em `src/index.ts`, foi implementada a validação de assinatura HMAC SHA256. O webhook agora verifica o header `x-webhook-signature` em cada requisição, comparando-o com um hash gerado usando um `WHATSAPP_WEBHOOK_SECRET` secreto. Requisições sem uma assinatura válida são rejeitadas com status `401 Unauthorized`.

3.  **Vazamento de Detalhes de Erro da API:**
    *   **Risco:** Em caso de falha na comunicação com as APIs da OpenAI/Gemini ou do Supabase, os detalhes do erro (mensagens, códigos de status) eram enviados diretamente ao usuário final.
    *   **Correção:** Os blocos `catch` em `src/logic/ChefRouter.ts`, `src/logic/VisionEngine.ts` e `src/logic/AIEngine.ts` foram refatorados. Agora, o erro detalhado é logado internamente para depuração, e o usuário recebe apenas uma mensagem genérica e amigável, como "Desculpe, tive um problema técnico. Pode repetir sua pergunta em um instante?".

### ⚡ Melhorias de Performance e Robustez

1.  **Rate Limiting Global:**
    *   **Risco:** A ausência de um limitador de requisições permitia que um usuário mal-intencionado (ou um bot) inundasse o sistema com mensagens, causando sobrecarga, custos elevados de API e negação de serviço para outros usuários.
    *   **Correção:** Foi implementado um rate limiter em memória em `src/index.ts`. Ele limita o número de requisições por IP para endpoints HTTP e por `userId` para os mensageiros (Telegram, WhatsApp), bloqueando temporariamente quem exceder o limite.

2.  **Cache em Memória para Arquivos:**
    *   **Problema:** O arquivo `ai-reputation-dossier.md` era lido do disco de forma síncrona a cada nova mensagem recebida, causando um gargalo de I/O e degradando a performance.
    *   **Correção:** Em `src/logic/AIEngine.ts`, a função `getBrandContext` agora implementa um cache em memória com TTL (Time-to-Live). O arquivo é lido do disco apenas uma vez e armazenado em cache por 10 minutos, reduzindo drasticamente as operações de I/O.

3.  **Tratamento de Erros no Banco de Dados:**
    *   **Problema:** Falhas nas operações com o Supabase (ex: inserção, seleção) eram frequentemente silenciosas ou logavam apenas uma mensagem genérica, dificultando a depuração.
    *   **Correção:** As classes `src/logic/SessionManager.ts` e `src/logic/LeadManager.ts` foram atualizadas para incluir blocos `catch` mais robustos, que logam o objeto de erro completo do Supabase (incluindo `code`, `details` e `hint`), fornecendo contexto essencial para resolver problemas de banco de dados rapidamente.

### 📂 Arquivos Modificados

*   `/src/utils/SupabaseClient.ts`: **(Segurança)**
*   `/src/index.ts`: **(Segurança, Performance)**
*   `/src/logic/AIEngine.ts`: **(Performance, Robustez)**
*   `/src/logic/SessionManager.ts`: **(Robustez)**
*   `/src/logic/LeadManager.ts`: **(Robustez)**
*   `/src/logic/ChefRouter.ts`: **(Segurança)**
*   `/src/logic/VisionEngine.ts`: **(Segurança)**
*   `/src/adapters/WhatsAppProvider.ts`: **(Robustez)**
*   `/src/logic/AdminRouter.ts`: **(Segurança)**
*   `/src/utils/EmbeddingGenerator.ts`: **(Robustez)**
*   `/.env.example`: Adicionadas as novas variáveis `SUPABASE_ANON_KEY` e `WHATSAPP_WEBHOOK_SECRET`.
