import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function setup() {
  console.log('[Setup] Iniciando configuração automatizada do banco de dados...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[Setup] Conectado ao PostgreSQL do Supabase.');

    // 1. Habilitar Extensão Vector
    console.log('[Setup] Habilitando extensão "vector"...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

    // 2. Criar Tabela Knowledge (768 dimensões para Gemini text-embedding-004)
    console.log('[Setup] Criando tabela "knowledge"...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge (
        id BIGSERIAL PRIMARY KEY,
        file_name TEXT UNIQUE,
        content TEXT NOT NULL,
        embedding VECTOR(768),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Criar Função de Busca match_knowledge
    console.log('[Setup] Criando função de busca "match_knowledge"...');
    await client.query(`
      CREATE OR REPLACE FUNCTION match_knowledge (
        query_embedding VECTOR(768),
        match_threshold FLOAT,
        match_count INT
      )
      RETURNS TABLE (
        id BIGINT,
        file_name TEXT,
        content TEXT,
        similarity FLOAT
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          knowledge.id,
          knowledge.file_name,
          knowledge.content,
          1 - (knowledge.embedding <=> query_embedding) AS similarity
        FROM knowledge
        WHERE 1 - (knowledge.embedding <=> query_embedding) > match_threshold
        ORDER BY similarity DESC
        LIMIT match_count;
      END;
      $$;
    `);

    console.log('✅ [Setup] Banco de dados configurado com sucesso!');
  } catch (error: any) {
    console.error('❌ [Setup] Erro crítico na configuração:', error.message);
  } finally {
    await client.end();
  }
}

setup().catch(console.error);
