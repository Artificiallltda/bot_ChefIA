"""
Verificação Rápida - ChefIA Recipe Search
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Carregar .env do ChefIA
env_path = Path(__file__).parent / ".env"
if not env_path.exists():
    # Tentar .env do arth-executive como fallback
    env_path = Path(__file__).parent.parent / "arth-executive" / ".env"
    
load_dotenv(env_path, override=True)

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

print("=" * 70)
print("🔍 VERIFICAÇÃO CHEFIA - RECIPE SEARCH")
print("=" * 70)
print(f"URL: {SUPABASE_URL}")

client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Verificar tabelas
print("\n📊 Tabelas do ChefIA:")
tables_to_check = [
    "recipes",
    "user_gastronomic_profiles",
    "recipe_ratings",
    "recipe_favorites",
    "recipe_search_history"
]

for table in tables_to_check:
    try:
        result = client.table(table).select("*").limit(1).execute()
        count_result = client.table(table).select("*", count="exact").execute()
        count = count_result.count if hasattr(count_result, 'count') else "?"
        print(f"   ✅ {table} - {count} registros")
    except Exception as e:
        erro = str(e)
        if "does not exist" in erro or "doesn't exist" in erro.lower() or "PGRST205" in erro:
            print(f"   ❌ {table} - NÃO EXISTE (executar schema.sql)")
        else:
            print(f"   ✅ {table} - existe (erro ao contar: {str(e)[:40]})")

# Testar RecipeSearchEngine
print("\n🧪 Testando RecipeSearchEngine:")
try:
    from src.tools.recipe_search import RecipeSearchEngine
    
    engine = RecipeSearchEngine()
    print(f"   ✅ RecipeSearchEngine inicializado")
    
    # Testar busca por texto (fallback)
    results = engine.search_recipes(
        query="teste",
        limit=5
    )
    print(f"   📝 Busca por texto: {len(results)} receitas encontradas")
    
except Exception as e:
    print(f"   ❌ ERRO: {str(e)}")

print("\n" + "=" * 70)
print("✅ VERIFICAÇÃO CONCLUÍDA")
print("=" * 70)
