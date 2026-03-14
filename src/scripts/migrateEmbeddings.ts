import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Script de Migração: VECTOR(1536) → VECTOR(768)
 * Altera a coluna de embedding e a função match_knowledge para 768 dimensões (Gemini).
 * Execute ANTES de re-indexar: npx ts-node src/scripts/migrateEmbeddings.ts
 */
async function migrate() {
  console.log('[Migração] Iniciando migração de embeddings OpenAI → Gemini...');
  console.log('[Migração] VECTOR(1536) → VECTOR(768)');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('[Migração] Conectado ao PostgreSQL.');

    // 1. Limpa os embeddings antigos (incompatíveis)
    console.log('[Migração] Limpando embeddings antigos (1536 dims)...');
    await client.query('UPDATE knowledge SET embedding = NULL;');

    // 2. Altera a coluna para 768 dimensões
    console.log('[Migração] Alterando coluna embedding para VECTOR(768)...');
    await client.query('ALTER TABLE knowledge ALTER COLUMN embedding TYPE VECTOR(768);');

    // 3. Recria a função match_knowledge com 768
    console.log('[Migração] Recriando função match_knowledge com VECTOR(768)...');
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

    console.log('✅ [Migração] Banco migrado com sucesso!');
    console.log('');
    console.log('📝 Próximo passo: re-indexe a base de conhecimento:');
    console.log('   npx ts-node src/scripts/indexKnowledge.ts');

  } catch (error: any) {
    console.error('❌ [Migração] Erro:', error.message);
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
