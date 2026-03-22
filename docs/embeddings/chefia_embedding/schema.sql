-- Schema SQL para ChefIA - Recipe Search Engine
-- Cria as tabelas necessárias para armazenar receitas com embeddings semânticos e perfis de usuário

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
    embedding vector(768),
    popularity_score FLOAT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para receitas
CREATE INDEX idx_recipe_cuisine ON recipes(cuisine_type);
CREATE INDEX idx_recipe_difficulty ON recipes(difficulty_level);
CREATE INDEX idx_recipe_cooking_time ON recipes(cooking_time);
CREATE INDEX idx_recipe_spice_level ON recipes(spice_level);
CREATE INDEX idx_recipe_created_at ON recipes(created_at DESC);

-- Índice HNSW para busca semântica eficiente
CREATE INDEX idx_recipe_embedding ON recipes 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Índice GIN para busca em arrays (ingredientes e tags)
CREATE INDEX idx_recipe_ingredients ON recipes USING GIN (ingredients);
CREATE INDEX idx_recipe_dietary_tags ON recipes USING GIN (dietary_tags);

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
CREATE INDEX idx_profile_user_id ON user_gastronomic_profiles(user_id);
CREATE INDEX idx_profile_dietary ON user_gastronomic_profiles USING GIN (dietary_preferences);
CREATE INDEX idx_profile_cuisines ON user_gastronomic_profiles USING GIN (favorite_cuisines);

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
CREATE INDEX idx_rating_user_id ON recipe_ratings(user_id);
CREATE INDEX idx_rating_recipe_id ON recipe_ratings(recipe_id);
CREATE INDEX idx_rating_created_at ON recipe_ratings(created_at DESC);

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
CREATE INDEX idx_search_user_id ON recipe_search_history(user_id);
CREATE INDEX idx_search_created_at ON recipe_search_history(created_at DESC);

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
CREATE INDEX idx_favorite_user_id ON recipe_favorites(user_id);
CREATE INDEX idx_favorite_recipe_id ON recipe_favorites(recipe_id);

-- Função para buscar receitas semanticamente similares
CREATE OR REPLACE FUNCTION search_recipes_semantic(
    query_embedding vector,
    similarity_threshold FLOAT DEFAULT 0.5,
    max_results INT DEFAULT 10,
    filter_clause TEXT DEFAULT 'TRUE'
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    ingredients TEXT[],
    instructions TEXT[],
    cuisine_type VARCHAR(50),
    difficulty_level VARCHAR(20),
    cooking_time INT,
    servings INT,
    dietary_tags TEXT[],
    spice_level INT,
    metadata JSONB,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    EXECUTE format(
        'SELECT 
            r.id,
            r.title,
            r.description,
            r.ingredients,
            r.instructions,
            r.cuisine_type,
            r.difficulty_level,
            r.cooking_time,
            r.servings,
            r.dietary_tags,
            r.spice_level,
            r.metadata,
            (1 - (r.embedding <=> $1))::FLOAT as similarity
        FROM recipes r
        WHERE %s
        AND (1 - (r.embedding <=> $1)) > $2
        ORDER BY similarity DESC
        LIMIT $3',
        filter_clause
    ) USING query_embedding, similarity_threshold, max_results;
END;
$$ LANGUAGE plpgsql;

-- Função para busca personalizada considerando perfil do usuário
CREATE OR REPLACE FUNCTION search_recipes_personalized(
    query_embedding vector,
    user_id VARCHAR(255),
    max_results INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    description TEXT,
    ingredients TEXT[],
    instructions TEXT[],
    cuisine_type VARCHAR(50),
    difficulty_level VARCHAR(20),
    cooking_time INT,
    servings INT,
    dietary_tags TEXT[],
    spice_level INT,
    metadata JSONB,
    similarity FLOAT,
    personalization_score FLOAT
) AS $$
DECLARE
    v_allergies TEXT[];
    v_disliked TEXT[];
    v_favorite_cuisines TEXT[];
    v_preferred_difficulty VARCHAR(20);
    v_cooking_time_pref INT;
    v_spice_pref INT;
BEGIN
    -- Recuperar perfil do usuário
    SELECT 
        allergies,
        disliked_ingredients,
        favorite_cuisines,
        preferred_difficulty,
        cooking_time_preference,
        spice_level
    INTO 
        v_allergies,
        v_disliked,
        v_favorite_cuisines,
        v_preferred_difficulty,
        v_cooking_time_pref,
        v_spice_pref
    FROM user_gastronomic_profiles
    WHERE user_gastronomic_profiles.user_id = search_recipes_personalized.user_id;

    -- Se não houver perfil, usar padrões
    v_allergies := COALESCE(v_allergies, '{}');
    v_disliked := COALESCE(v_disliked, '{}');
    v_favorite_cuisines := COALESCE(v_favorite_cuisines, '{}');
    v_preferred_difficulty := COALESCE(v_preferred_difficulty, 'medium');
    v_cooking_time_pref := COALESCE(v_cooking_time_pref, 60);
    v_spice_pref := COALESCE(v_spice_pref, 5);

    RETURN QUERY
    SELECT 
        r.id,
        r.title,
        r.description,
        r.ingredients,
        r.instructions,
        r.cuisine_type,
        r.difficulty_level,
        r.cooking_time,
        r.servings,
        r.dietary_tags,
        r.spice_level,
        r.metadata,
        (1 - (r.embedding <=> query_embedding))::FLOAT as similarity,
        (
            1.0 +
            CASE WHEN r.cuisine_type = ANY(v_favorite_cuisines) THEN 0.2 ELSE 0 END +
            CASE WHEN r.difficulty_level = v_preferred_difficulty THEN 0.1 ELSE -0.05 END +
            CASE WHEN r.cooking_time <= v_cooking_time_pref THEN 0.1 ELSE -0.1 END -
            (ABS(r.spice_level - v_spice_pref)::FLOAT / 10.0) * 0.1
        )::FLOAT as personalization_score
    FROM recipes r
    WHERE NOT r.ingredients && v_allergies
    AND NOT r.ingredients && v_disliked
    AND (1 - (r.embedding <=> query_embedding)) > 0.5
    ORDER BY personalization_score DESC, similarity DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar score de popularidade
CREATE OR REPLACE FUNCTION update_recipe_popularity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE recipes
    SET popularity_score = (
        SELECT COUNT(*) * 0.5 + AVG(COALESCE(rating, 0)) * 0.5
        FROM recipe_ratings
        WHERE recipe_id = NEW.recipe_id
    )
    WHERE id = NEW.recipe_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar popularidade quando há nova avaliação
CREATE TRIGGER trigger_update_recipe_popularity
AFTER INSERT OR UPDATE ON recipe_ratings
FOR EACH ROW
EXECUTE FUNCTION update_recipe_popularity();

-- Função para registrar busca no histórico
CREATE OR REPLACE FUNCTION log_recipe_search(
    user_id_param VARCHAR(255),
    query_param TEXT,
    results_count_param INT,
    clicked_recipe_id_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    search_id UUID;
BEGIN
    INSERT INTO recipe_search_history (user_id, query, results_count, clicked_recipe_id)
    VALUES (user_id_param, query_param, results_count_param, clicked_recipe_id_param)
    RETURNING id INTO search_id;
    
    RETURN search_id;
END;
$$ LANGUAGE plpgsql;

-- Função para obter recomendações baseadas em favoritos
CREATE OR REPLACE FUNCTION get_recommendations_from_favorites(
    user_id_param VARCHAR(255),
    max_results INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH favorite_recipes AS (
        SELECT r.embedding
        FROM recipe_favorites rf
        JOIN recipes r ON rf.recipe_id = r.id
        WHERE rf.user_id = user_id_param
    ),
    avg_embedding AS (
        SELECT AVG(embedding) as avg_emb FROM favorite_recipes
    )
    SELECT 
        r.id,
        r.title,
        (1 - (r.embedding <=> ae.avg_emb))::FLOAT as similarity
    FROM recipes r, avg_embedding ae
    WHERE r.id NOT IN (
        SELECT recipe_id FROM recipe_favorites WHERE user_id = user_id_param
    )
    AND (1 - (r.embedding <=> ae.avg_emb)) > 0.5
    ORDER BY similarity DESC
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Política de Row Level Security (RLS) para segurança
-- NOTA: Como usamos user_id como VARCHAR, desabilitamos RLS para simplificar ou usamos políticas customizadas
ALTER TABLE user_gastronomic_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_search_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_favorites DISABLE ROW LEVEL SECURITY;

-- Comentários para documentação
COMMENT ON TABLE recipes IS 'Armazena receitas com embeddings semânticos para busca contextual';
COMMENT ON COLUMN recipes.embedding IS 'Vetor de embedding de 768 dimensões gerado pelo Gemini Embedding 2';
COMMENT ON COLUMN recipes.popularity_score IS 'Score calculado a partir de avaliações e número de cliques';

COMMENT ON TABLE user_gastronomic_profiles IS 'Perfil de preferências gastronômicas do usuário para personalização';
COMMENT ON TABLE recipe_ratings IS 'Avaliações de receitas feitas pelos usuários';
COMMENT ON TABLE recipe_search_history IS 'Histórico de buscas para análise de comportamento';
COMMENT ON TABLE recipe_favorites IS 'Receitas marcadas como favoritas pelos usuários';

COMMENT ON FUNCTION search_recipes_semantic IS 'Busca receitas semanticamente similares com filtros opcionais';
COMMENT ON FUNCTION search_recipes_personalized IS 'Busca receitas considerando perfil e preferências do usuário';
COMMENT ON FUNCTION get_recommendations_from_favorites IS 'Gera recomendações baseadas em receitas favoritas do usuário';