# PRD: Integração Gemini Embedding 2 (Arth & ChefIA)

## 1. Objetivos
Implementar busca semântica e memória inteligente nos dois pilares do ecossistema:
- **Arth Executive:** Memória de conversas persistente e recuperação de contexto relevante (RAG interno).
- **ChefIA:** Motor de busca de receitas por significado e sistema de recomendação baseado no perfil gastronômico do usuário.

## 2. Pilares Tecnológicos
- **Modelo:** `models/text-embedding-004` (768 dimensões).
- **Banco de Dados:** Supabase com a extensão `pgvector`.
- **Lógica de Busca:** Similaridade de Cosseno via RPC no PostgreSQL.

---

## 3. Implementação: Arth Executive (Memory Manager)

### Fluxo de Funcionamento
1.  **Armazenamento:** Cada mensagem (User/Assistant) é vetorizada e salva na tabela `conversation_messages`.
2.  **Recuperação:** Ao receber uma nova mensagem, o sistema busca as 5 mensagens mais similares no histórico para injetar como "Contexto de Memória" no prompt do agente.

### Componentes Chave (`memory_manager.py`)
- `store_message()`: Vetoriza e persiste a conversa.
- `get_context_for_agent()`: Gera o bloco de texto de contexto para o Orquestrador.

---

## 4. Implementação: ChefIA (Recipe Search)

### Fluxo de Funcionamento
1.  **Indexação:** Receitas são transformadas em vetores baseados em título, ingredientes e descrição.
2.  **Personalização:** A busca aplica pesos extras baseados no `UserGastronomicProfile` (Ex: +0.2 se for a culinária favorita, -0.1 se for difícil demais p/ o usuário).

### Componentes Chave (`recipe_search.py`)
- `search_recipes()`: Busca semântica bruta.
- `personalize_recommendations()`: Filtra por alergias e reordena por afinidade de perfil.

---

## 5. Guia de Implementação para o AIOS

### Passo 1: Infraestrutura (SQL)
> [!IMPORTANT]
> O AIOS deve executar os arquivos `schema.sql` fornecidos em seus respectivos projetos no Supabase antes de rodar o código Python. Isso habilita o `pgvector` e as funções `rpc`.

### Passo 2: Variáveis de Ambiente
Configurar no `.env` do Railway/Local:
- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`

### Passo 3: Códigos de Injeção
- No **Arth**, o AIOS deve integrar o `MemoryManager` no loop do `agent_node` em `graph.py`.
- No **ChefIA**, o AIOS deve criar a ferramenta `/search` invocando o `RecipeSearchEngine`.

## 6. Verficação
- **Teste Arth:** Perguntar algo sobre um assunto falado há 2 dias. O bot deve recuperar o contexto.
- **Teste ChefIA:** Buscar "almoço leve" tendo perfil "Vegetariano". O sistema deve priorizar saladas e massas sem carne.
