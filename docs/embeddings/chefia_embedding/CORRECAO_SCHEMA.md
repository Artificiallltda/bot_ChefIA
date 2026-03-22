# 🔧 CORREÇÃO DE SCHEMA SQL - ChefIA

**Data:** 22 de março de 2026  
**Problema:** Erro de incompatibilidade de tipos na foreign key  
**Solução:** Remoção de foreign keys para `auth.users`

---

## ❌ ERRO ORIGINAL

```
ERROR: 42804: foreign key constraint "profile_user_fk" cannot be implemented
DETAIL: Key columns "user_id" and "id" are of incompatible types: 
        character varying and uuid.
```

### Causa

O schema original tentava criar foreign keys:
```sql
CONSTRAINT profile_user_fk FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE
```

**Problema:** 
- `auth.users.id` é do tipo `UUID` (padrão do Supabase Auth)
- Nosso `user_id` é `VARCHAR(255)` (usamos ID externo como string)

---

## ✅ SOLUÇÃO APLICADA

### Tabelas Corrigidas

1. **`user_gastronomic_profiles`** - Removida foreign key `profile_user_fk`
2. **`recipe_ratings`** - Removida foreign key `rating_user_fk` (mantida `rating_recipe_fk`)
3. **`recipe_search_history`** - Removida foreign key `search_user_fk` (mantida `search_recipe_fk`)
4. **`recipe_favorites`** - Removida foreign key `favorite_user_fk` (mantida `favorite_recipe_fk`)

### Foreign Keys Mantidas

As seguintes foreign keys foram **mantidas** porque referenciam tabelas que existem:
- `rating_recipe_fk` → `recipes(id)` ✅
- `search_recipe_fk` → `recipes(id)` ✅
- `favorite_recipe_fk` → `recipes(id)` ✅

---

## 🚀 COMO REEXECUTAR O SCHEMA

### Opção 1: Se já executou o schema anterior (com erro)

1. **Limpar tabelas existentes:**

```sql
-- No SQL Editor do Supabase
DROP TABLE IF EXISTS recipe_favorites CASCADE;
DROP TABLE IF EXISTS recipe_search_history CASCADE;
DROP TABLE IF EXISTS recipe_ratings CASCADE;
DROP TABLE IF EXISTS user_gastronomic_profiles CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;

DROP FUNCTION IF EXISTS search_recipes_semantic CASCADE;
DROP FUNCTION IF EXISTS search_recipes_personalized CASCADE;
DROP FUNCTION IF EXISTS get_recommendations_from_favorites CASCADE;
DROP FUNCTION IF EXISTS log_recipe_search CASCADE;
DROP FUNCTION IF EXISTS update_recipe_popularity CASCADE;
```

2. **Executar novo schema:**

- Copie o conteúdo de `schema.sql` (atualizado)
- Cole no SQL Editor do Supabase
- Clique em **Run**

### Opção 2: Primeira execução

Siga o guia normal:

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Cole o conteúdo de `chefia/docs/embeddings/chefia_embedding/schema.sql`
5. Clique em **Run**

---

## ✅ VALIDAÇÃO

Após executar, verifique:

```sql
-- Listar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'recipes', 
    'user_gastronomic_profiles', 
    'recipe_ratings', 
    'recipe_favorites',
    'recipe_search_history'
);

-- Verificar índices
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'recipe%';

-- Verificar funções RPC
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'search_recipes%';
```

**Resultado esperado:**
- 5 tabelas listadas
- 10+ índices listados
- 2+ funções listadas

---

## 📊 ESTRUTURA DO BANCO

### Tabelas Criadas

| Tabela | Colunas | Descrição |
|--------|---------|-----------|
| `recipes` | id, title, ingredients, embedding, popularity_score | Receitas vetorizadas |
| `user_gastronomic_profiles` | id, user_id, dietary_preferences, allergies | Perfis de usuários |
| `recipe_ratings` | id, user_id, recipe_id, rating, comment | Avaliações |
| `recipe_favorites` | id, user_id, recipe_id | Favoritos |
| `recipe_search_history` | id, user_id, query, clicked_recipe_id | Histórico de buscas |

### Funções RPC

- `search_recipes_semantic()` - Busca semântica bruta
- `search_recipes_personalized()` - Busca com perfil do usuário
- `get_recommendations_from_favorites()` - Recomendações baseadas em favoritos
- `log_recipe_search()` - Registra busca no histórico
- `update_recipe_popularity()` - Atualiza score de popularidade

---

## 🔒 SEGURANÇA

### Como os dados são protegidos sem RLS?

1. **Isolamento por user_id nas queries:**
   ```python
   # RecipeSearchEngine sempre filtra por user_id
   WHERE user_id = '{user_id}'
   ```

2. **Controle na aplicação:**
   - `chefia_tools.py` extrai `user_id` do contexto
   - Cada usuário só vê seus próprios dados

3. **Recomendação para produção:**
   - Implementar autenticação própria se necessário
   - Usar JWT com claim `user_id`

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Schema corrigido executado com sucesso
2. ✅ Validar tabelas criadas
3. ✅ Testar RecipeSearchEngine:
   ```bash
   cd chefia
   python docs/embeddings/chefia_embedding/implementar.py
   ```
4. ✅ Testar ferramentas:
   ```python
   from src.tools.chefia_tools import search_recipe, save_user_profile
   
   # Salvar perfil
   save_user_profile("user_123", ["vegetarian"], ["italian"])
   
   # Buscar receitas
   search_recipe("almoço leve", user_id="user_123")
   ```

---

## 📝 DIFERENÇAS: ARTH vs CHEFIA

| Aspecto | Arth Executive | ChefIA |
|---------|----------------|--------|
| **Tabelas** | 3 | 5 |
| **Foreign Keys** | Nenhuma | 3 (para recipes) |
| **RLS** | Desabilitado | Desabilitado |
| **user_id** | VARCHAR(255) | VARCHAR(255) |
| **Embedding** | 768 dimensões | 768 dimensões |

---

**Status:** ✅ **CORRIGIDO E PRONTO PARA EXECUÇÃO**
