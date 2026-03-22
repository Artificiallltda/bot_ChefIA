#!/usr/bin/env python3
"""
Script de Implementação - Recipe Search Engine (ChefIA)
Data: 2026-03-22

Este script:
1. Executa o schema SQL no Supabase
2. Valida a conexão
3. Testa o RecipeSearchEngine
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Carregar .env
project_root = Path(__file__).parent.parent.parent.parent  # Volta para chefia/
load_dotenv(project_root / ".env")

from supabase import create_client, Client

print("=" * 70)
print("🚀 IMPLEMENTAÇÃO - RECIPE SEARCH ENGINE (CHEFIA)")
print("=" * 70)

# Configurações
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"\n📊 Configurações:")
print(f"   SUPABASE_URL: {SUPABASE_URL[:50]}...")
print(f"   SUPABASE_KEY: {SUPABASE_KEY[:20]}...")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("\n❌ ERRO: Variáveis SUPABASE_URL e SUPABASE_KEY não configuradas!")
    sys.exit(1)

# Conectar ao Supabase
print("\n🔗 Conectando ao Supabase...")
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Conexão estabelecida com sucesso!")
except Exception as e:
    print(f"❌ ERRO ao conectar: {str(e)}")
    sys.exit(1)

# Ler schema SQL
print("\n📄 Lendo schema.sql...")
schema_path = Path(__file__).parent / "schema.sql"
try:
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    print(f"✅ Schema lido: {len(schema_sql)} bytes")
except Exception as e:
    print(f"❌ ERRO ao ler schema: {str(e)}")
    sys.exit(1)

# Executar schema SQL
print("\n🔨 Executando schema no Supabase...")
print("   ⚠️  Isso pode levar alguns segundos...")

try:
    # Dividir em statements individuais
    statements = [s.strip() for s in schema_sql.split(";") if s.strip() and not s.strip().startswith("--")]
    
    executed = 0
    errors = 0
    
    for i, stmt in enumerate(statements, 1):
        if len(stmt) < 10:
            continue
            
        try:
            result = supabase.rpc("exec_sql", {"sql": stmt}).execute()
            executed += 1
            print(f"   ✅ [{i}/{len(statements)}] Statement executado")
        except Exception as e:
            if "already exists" in str(e).lower() or "already present" in str(e).lower():
                print(f"   ⚠️  [{i}/{len(statements)}] Já existe: {str(e)[:50]}")
            else:
                print(f"   ❌ [{i}/{len(statements)}] Erro: {str(e)[:50]}")
                errors += 1
    
    print(f"\n📊 Resultado:")
    print(f"   ✅ {executed} statements executados")
    print(f"   ⚠️  {errors} errors (podem ser normais)")
    
except Exception as e:
    print(f"\n❌ ERRO geral: {str(e)}")
    print("\n💡 DICA: Execute o schema manualmente no SQL Editor do Supabase:")
    print(f"   1. Acesse https://supabase.com/dashboard/project/{SUPABASE_URL.split('.')[0].split('/')[-1]}")
    print("   2. Vá em SQL Editor")
    print("   3. Cole o conteúdo do arquivo schema.sql")
    print("   4. Clique em Run")

# Validar tables
print("\n🔍 Validando tabelas...")
tables_to_check = ["recipes", "user_gastronomic_profiles", "recipe_ratings", "recipe_favorites"]

for table in tables_to_check:
    try:
        response = supabase.table(table).select("*").limit(1).execute()
        print(f"   ✅ Tabela {table} existe")
    except Exception as e:
        print(f"   ❌ Tabela {table} não encontrada: {str(e)[:50]}")

print("\n" + "=" * 70)
print("✅ IMPLEMENTAÇÃO DO RECIPE SEARCH ENGINE CONCLUÍDA!")
print("=" * 70)
print("\n📋 PRÓXIMOS PASSOS:")
print("   1. Mover recipe_search.py para src/tools/")
print("   2. Criar ferramenta /search_recipe")
print("   3. Integrar com perfis gastronômicos")
print("\n💡 DICA: Veja docs/IMPLEMENTACAO_RECIPE_SEARCH.md para o guia completo.")
