-- Schema SQL para ChefIA - Recipe Search Engine
-- Atualizado para Gemini Embedding 2 (3072 dimensões)
-- Data: 2026-03-22

-- Habilitar extensão pgvector (executar uma vez no banco de dados)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela de receitas
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    ingredients TEXT[] NOT NULL,
    instructions TEXT[] NOT NULL,
    cuisine_type VARCHAR(50) NOT NULL,
    difficulty_level VARCHAR(20) NOT NULL CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    cooking_time INT NOT NULL,
    servings INT NOT NULL,
    dietary_tags TEXT[] DEFAULT '{}',
    spice_level INT DEFAULT 5 CHECK (spice_level >= 0 AND spice_level <= 10),
    embedding vector(3072),  -- Gemini Embedding 2 usa 3072 dimensões
    popularity_score FLOAT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para receitas
CREATE INDEX IF NOT EXISTS idx_recipe_cuisine ON recipes(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_recipe_difficulty ON recipes(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_recipe_cooking_time ON recipes(cooking_time);
CREATE INDEX IF NOT EXISTS idx_recipe_spice_level ON recipes(spice_level);
CREATE INDEX IF NOT EXISTS idx_recipe_created_at ON recipes(created_at DESC);

-- Índice HNSW para busca semântica eficiente
CREATE INDEX IF NOT EXISTS idx_recipe_embedding ON recipes
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índice GIN para busca em arrays (ingredientes e tags)
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients ON recipes USING GIN (ingredients);
CREATE INDEX IF NOT EXISTS idx_recipe_dietary_tags ON recipes USING GIN (dietary_tags);

-- Tabela de perfis gastronômicos dos usuários
CREATE TABLE IF NOT EXISTS user_gastronomic_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    dietary_preferences TEXT[] DEFAULT '{}',
    favorite_cuisines TEXT[] DEFAULT '{}',
    allergies TEXT[] DEFAULT '{}',
    disliked_ingredients TEXT[] DEFAULT '{}',
    preferred_difficulty VARCHAR(20) DEFAULT 'medium',
    cooking_time_preference INT DEFAULT 60,
    spice_level INT DEFAULT 5 CHECK (spice_level >= 0 AND spice_level <= 10),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para perfis
CREATE INDEX IF NOT EXISTS idx_profile_user_id ON user_gastronomic_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_dietary ON user_gastronomic_profiles USING GIN (dietary_preferences);
CREATE INDEX IF NOT EXISTS idx_profile_cuisines ON user_gastronomic_profiles USING GIN (favorite_cuisines);

-- Tabela de avaliações de receitas
CREATE TABLE IF NOT EXISTS recipe_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    recipe_id UUID NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT rating_recipe_fk FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_recipe_rating UNIQUE (user_id, recipe_id)
);

-- Índices para avaliações
CREATE INDEX IF NOT EXISTS idx_rating_user_id ON recipe_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_rating_recipe_id ON recipe_ratings(recipe_id);
CREATE INDEX IF NOT EXISTS idx_rating_created_at ON recipe_ratings(created_at DESC);

-- Tabela de histórico de buscas do usuário
CREATE TABLE IF NOT EXISTS recipe_search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    results_count INT,
    clicked_recipe_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT search_recipe_fk FOREIGN KEY (clicked_recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
);

-- Índices para histórico de buscas
CREATE INDEX IF NOT EXISTS idx_search_user_id ON recipe_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_created_at ON recipe_search_history(created_at DESC);

-- Tabela de favoritos do usuário
CREATE TABLE IF NOT EXISTS recipe_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    recipe_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT favorite_recipe_fk FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_recipe_favorite UNIQUE (user_id, recipe_id)
);

-- Índices para favoritos
CREATE INDEX IF NOT EXISTS idx_favorite_user_id ON recipe_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_recipe_id ON recipe_favorites(recipe_id);

-- Política de Row Level Security (RLS) - DESABILITADO
-- A segurança é aplicada na camada da aplicação
ALTER TABLE user_gastronomic_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_search_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_favorites DISABLE ROW LEVEL SECURITY;

-- Comentários para documentação
COMMENT ON TABLE recipes IS 'Armazena receitas com embeddings semânticos para busca contextual';
COMMENT ON COLUMN recipes.embedding IS 'Vetor de embedding de 3072 dimensões gerado pelo Gemini Embedding 2';
COMMENT ON COLUMN recipes.popularity_score IS 'Score calculado a partir de avaliações e número de cliques';

COMMENT ON TABLE user_gastronomic_profiles IS 'Perfil de preferências gastronômicas do usuário para personalização';
COMMENT ON TABLE recipe_ratings IS 'Avaliações de receitas feitas pelos usuários';
COMMENT ON TABLE recipe_search_history IS 'Histórico de buscas para análise de comportamento';
COMMENT ON TABLE recipe_favorites IS 'Receitas marcadas como favoritas pelos usuários';

-- Mensagem de sucesso
DO $$
BEGIN
    RAISE NOTICE '✅ Schema do ChefIA instalado com sucesso!';
    RAISE NOTICE '📊 Tabelas criadas: recipes, user_gastronomic_profiles, recipe_ratings, recipe_favorites, recipe_search_history';
    RAISE NOTICE '🔧 Embeddings: 3072 dimensões (Gemini Embedding 2)';
END $$;
