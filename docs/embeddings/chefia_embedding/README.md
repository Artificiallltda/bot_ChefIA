# ChefIA - Recipe Search Engine com Gemini Embedding 2

Implementação de **busca semântica em receitas** com **personalização por perfil gastronômico** usando Gemini Embedding 2 e Supabase pgvector. O sistema permite buscar receitas por similaridade semântica e personalizar recomendações baseado nas preferências do usuário.

## 🎯 Funcionalidades

- **Busca Semântica**: Busca receitas por significado, não apenas palavras-chave
- **Personalização**: Recomendações adaptadas ao perfil gastronômico do usuário
- **Filtros Inteligentes**: Considera alergias, preferências dietéticas, tempo de preparo
- **Avaliações**: Sistema de ratings e comentários sobre receitas
- **Favoritos**: Marque receitas favoritas e obtenha recomendações similares
- **Histórico**: Rastreie buscas e cliques para melhorar recomendações
- **Trending**: Receitas mais populares baseado em avaliações e engajamento
- **Row Level Security**: Cada usuário vê apenas seus próprios dados

## 📋 Pré-requisitos

- Python 3.8+
- Projeto Supabase com pgvector habilitado
- Chave de API do Google Gemini
- Acesso ao repositório ChefIA

## 🚀 Instalação

### 1. Clonar o repositório ChefIA

```bash
git clone https://github.com/Artificiallltda/bot_ChefIA.git
cd bot_ChefIA
```

### 2. Instalar dependências

```bash
# Copiar o arquivo recipe_search.py para o projeto
cp /path/to/recipe_search.py ./src/

# Instalar pacotes Python necessários
pip install google-generativeai supabase python-dotenv
```

### 3. Configurar variáveis de ambiente

Criar arquivo `.env` na raiz do projeto:

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# Opcional: configurações de logging
LOG_LEVEL=INFO
```

### 4. Executar schema SQL no Supabase

1. Acessar [Supabase Dashboard](https://app.supabase.com)
2. Ir para **SQL Editor**
3. Criar nova query
4. Copiar conteúdo de `schema.sql`
5. Executar a query

Ou via CLI:

```bash
supabase db push --db-url postgresql://user:password@host:5432/database < schema.sql
```

## 📚 Uso

### Inicializar o Recipe Search Engine

```python
from src.recipe_search import RecipeSearchEngine, Recipe, CuisineType, DifficultyLevel

# Inicializar (carrega variáveis de ambiente automaticamente)
engine = RecipeSearchEngine()
```

### Adicionar receitas ao banco

```python
recipe = Recipe(
    id="recipe_001",
    title="Pasta Primavera",
    description="Massa fresca com vegetais da estação",
    ingredients=["pasta", "tomate", "abobrinha", "pimentão", "azeite"],
    instructions=[
        "Cozinhe a pasta al dente",
        "Refogue os vegetais em azeite",
        "Misture a pasta com os vegetais"
    ],
    cuisine_type=CuisineType.ITALIAN,
    difficulty_level=DifficultyLevel.EASY,
    cooking_time=30,
    servings=4,
    dietary_tags=["vegetarian", "gluten_free_option"],
    spice_level=2
)

recipe_id = engine.add_recipe(recipe)
print(f"Receita adicionada: {recipe_id}")
```

### Buscar receitas por similaridade

```python
# Busca simples
results = engine.search_recipes(
    query="receita rápida com frango",
    limit=5
)

for recipe in results:
    print(f"- {recipe['title']}")
    print(f"  Similaridade: {recipe['similarity']:.2%}")
    print(f"  Tempo: {recipe['cooking_time']} min\n")
```

### Buscar com filtros

```python
# Buscar receitas italianas fáceis com até 45 minutos
results = engine.search_recipes(
    query="receita vegetariana",
    cuisine_filter=CuisineType.ITALIAN,
    difficulty_filter=DifficultyLevel.EASY,
    max_cooking_time=45,
    limit=10
)
```

### Criar e salvar perfil do usuário

```python
from src.recipe_search import UserGastronomicProfile, DietaryPreference

profile = UserGastronomicProfile(
    user_id="user_123",
    dietary_preferences=[DietaryPreference.VEGETARIAN],
    favorite_cuisines=[CuisineType.ITALIAN, CuisineType.ASIAN],
    allergies=["peanuts", "shellfish"],
    disliked_ingredients=["olives", "anchovas"],
    preferred_difficulty=DifficultyLevel.MEDIUM,
    cooking_time_preference=45,  # minutos
    spice_level=6  # 0-10
)

# Salvar perfil
engine.save_user_profile(profile)
```

### Buscar receitas personalizadas

```python
# Recuperar perfil do usuário
profile = engine.get_user_profile("user_123")

# Buscar com personalização
results = engine.personalize_recommendations(
    query="receita para jantar",
    user_profile=profile,
    limit=5
)

for recipe in results:
    print(f"- {recipe['title']}")
    print(f"  Similaridade: {recipe['similarity']:.2%}")
    print(f"  Score de personalização: {recipe['personalization_score']:.2f}\n")
```

### Registrar avaliação de receita

```python
# Usuário avalia uma receita
engine.rate_recipe(
    user_id="user_123",
    recipe_id="recipe_001",
    rating=5,
    comment="Adorei! Muito saudável e rápido de fazer."
)
```

### Marcar como favorito

```python
# Adicionar à tabela de favoritos via Supabase
engine.supabase.table("recipe_favorites").insert({
    "user_id": "user_123",
    "recipe_id": "recipe_001"
}).execute()
```

### Obter recomendações baseadas em favoritos

```python
# Receitas similares aos favoritos do usuário
recommendations = engine.supabase.rpc(
    "get_recommendations_from_favorites",
    {
        "user_id_param": "user_123",
        "max_results": 5
    }
).execute()

for rec in recommendations.data:
    print(f"- {rec['title']} (Similaridade: {rec['similarity']:.2%})")
```

### Obter receitas em tendência

```python
trending = engine.get_trending_recipes(
    limit=10,
    cuisine_filter=CuisineType.BRAZILIAN
)

print("Receitas em tendência:")
for recipe in trending:
    print(f"- {recipe['title']}")
    print(f"  Popularidade: {recipe['popularity_score']:.2f}\n")
```

## 🔌 Integração com ChefIA

### Exemplo: Integração com Telegram Bot

```python
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from src.recipe_search import RecipeSearchEngine

engine = RecipeSearchEngine()

async def search_recipe(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /search <query>"""
    if not context.args:
        await update.message.reply_text("Use: /search <sua busca>")
        return
    
    query = " ".join(context.args)
    user_id = str(update.effective_user.id)
    
    # Recuperar perfil do usuário
    profile = engine.get_user_profile(user_id)
    
    # Buscar receitas personalizadas
    if profile:
        results = engine.personalize_recommendations(query, profile, limit=3)
    else:
        results = engine.search_recipes(query, limit=3)
    
    if not results:
        await update.message.reply_text("Nenhuma receita encontrada 😢")
        return
    
    # Formatar resposta
    response = "🍳 Receitas encontradas:\n\n"
    for i, recipe in enumerate(results, 1):
        response += f"{i}. *{recipe['title']}*\n"
        response += f"   ⏱️ {recipe['cooking_time']} min | "
        response += f"👥 {recipe['servings']} porções\n"
        response += f"   Ingredientes: {', '.join(recipe['ingredients'][:3])}...\n\n"
    
    await update.message.reply_text(response, parse_mode="Markdown")

# Configurar bot
app = Application.builder().token("YOUR_BOT_TOKEN").build()
app.add_handler(CommandHandler("search", search_recipe))
```

### Exemplo: Integração com FastAPI

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from src.recipe_search import RecipeSearchEngine

app = FastAPI()
engine = RecipeSearchEngine()

class SearchRequest(BaseModel):
    user_id: str
    query: str
    limit: int = 5

@app.post("/search")
async def search(request: SearchRequest):
    """Buscar receitas com personalização"""
    try:
        profile = engine.get_user_profile(request.user_id)
        
        if profile:
            results = engine.personalize_recommendations(
                request.query,
                profile,
                limit=request.limit
            )
        else:
            results = engine.search_recipes(
                request.query,
                limit=request.limit
            )
        
        return {"recipes": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/rate")
async def rate_recipe(user_id: str, recipe_id: str, rating: int, comment: str = None):
    """Registrar avaliação de receita"""
    try:
        engine.rate_recipe(user_id, recipe_id, rating, comment)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/trending")
async def get_trending(limit: int = 10):
    """Obter receitas em tendência"""
    try:
        trending = engine.get_trending_recipes(limit)
        return {"recipes": trending}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## 🔐 Segurança

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. Usuários só podem acessar seus próprios dados:

```sql
-- Política automática: usuários só veem seus próprios favoritos
SELECT * FROM recipe_favorites 
WHERE user_id = auth.uid()::text
```

### Variáveis de Ambiente

Nunca commitar `.env` no repositório:

```bash
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
```

### Validação de Entrada

```python
# Validar rating
if not 1 <= rating <= 5:
    raise ValueError("Rating deve estar entre 1 e 5")

# Validar query
if len(query) < 3:
    raise ValueError("Query deve ter pelo menos 3 caracteres")
```

## 📊 Analytics

### Histórico de buscas

```python
# Registrar busca (automático com RPC)
engine.supabase.rpc(
    "log_recipe_search",
    {
        "user_id_param": "user_123",
        "query_param": "receita rápida",
        "results_count_param": 5,
        "clicked_recipe_id_param": "recipe_001"
    }
).execute()

# Consultar histórico
history = engine.supabase.table("recipe_search_history").select(
    "*"
).eq("user_id", "user_123").order("created_at", desc=True).limit(10).execute()
```

### Estatísticas de receitas

```python
# Receitas mais bem avaliadas
top_rated = engine.supabase.table("recipes").select(
    "id, title, popularity_score"
).order("popularity_score", desc=True).limit(10).execute()

# Receitas mais clicadas
most_clicked = engine.supabase.table("recipe_search_history").select(
    "clicked_recipe_id, COUNT(*) as clicks"
).group_by("clicked_recipe_id").order("clicks", desc=True).limit(10).execute()
```

## 🎛️ Configurações Avançadas

### Ajustar limiar de similaridade

```python
# Mais restritivo
results = engine.search_recipes(
    query="minha busca",
    threshold=0.7  # padrão: 0.5
)

# Mais permissivo
results = engine.search_recipes(
    query="minha busca",
    threshold=0.3
)
```

### Customizar scoring de personalização

```python
# Modificar pesos no método _apply_user_filters
def _apply_user_filters(self, recipes, user_profile):
    for recipe in recipes:
        score = 1.0
        
        # Aumentar peso para culinária favorita
        if recipe.get("cuisine_type") in [c.value for c in user_profile.favorite_cuisines]:
            score += 0.5  # era 0.2
        
        # ... resto da lógica
```

### Usar modelo de embedding diferente

```python
# Suporte para modelos alternativos
engine.EMBEDDING_MODEL = "models/gemini-embedding-exp-03-07"
```

## 🐛 Troubleshooting

### Erro: "Nenhuma receita encontrada"

- Verificar se há receitas no banco: `SELECT COUNT(*) FROM recipes`
- Verificar se embeddings foram gerados: `SELECT COUNT(*) FROM recipes WHERE embedding IS NOT NULL`
- Aumentar `threshold` na busca
- Verificar query: muito específica ou muito genérica?

### Personalização não funciona

- Verificar se perfil foi salvo: `SELECT * FROM user_gastronomic_profiles WHERE user_id = 'user_123'`
- Verificar alergias: `SELECT allergies FROM user_gastronomic_profiles WHERE user_id = 'user_123'`
- Verificar se receitas têm tags dietéticas corretas

### Performance lenta

- Verificar índices: `SELECT * FROM pg_indexes WHERE tablename = 'recipes'`
- Aumentar `ef_construction` no índice HNSW
- Usar `VACUUM ANALYZE` para otimizar tabelas
- Considerar paginação para grandes resultados

## 📖 Referências

- [Google Generative AI Python SDK](https://ai.google.dev/tutorials/python_quickstart)
- [Supabase pgvector Documentation](https://supabase.com/docs/guides/database/extensions/pgvector)
- [Gemini Embedding Models](https://ai.google.dev/models/gemini-embedding)
- [PostgreSQL GIN Indexes](https://www.postgresql.org/docs/current/gin-intro.html)

## 📝 Licença

Este projeto segue a mesma licença do ChefIA.

## 🤝 Suporte

Para problemas ou dúvidas:

1. Verificar [Issues no GitHub](https://github.com/Artificiallltda/bot_ChefIA/issues)
2. Consultar documentação do Supabase
3. Revisar logs em `recipe_search.log`

## 🔄 Próximos Passos

- [ ] Implementar cache de embeddings
- [ ] Adicionar suporte a múltiplos idiomas
- [ ] Criar dashboard de analytics
- [ ] Implementar recomendações em tempo real
- [ ] Adicionar suporte a receitas em batch
- [ ] Integrar com APIs de nutrição
- [ ] Criar sistema de meal planning
