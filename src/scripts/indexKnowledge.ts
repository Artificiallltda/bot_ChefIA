import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../utils/SupabaseClient';
import { EmbeddingGenerator } from '../utils/EmbeddingGenerator';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Script de Indexação RAG (God Mode)
 * Roda periodicamente ou sob demanda para atualizar a base de conhecimento no Supabase.
 */
async function indexAllKnowledge() {
  const KNOWLEDGE_DIR = path.join(__dirname, '..', '..', 'knowledge');
  
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.error('[Indexer] Diretório de conhecimento não encontrado!');
    return;
  }

  const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));
  console.log(`[Indexer] Encontrados ${files.length} arquivos para indexação...`);

  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Para arquivos muito grandes, no futuro podemos "chunkar" (quebrar em pedaços)
    // Por enquanto, vamos tratar cada arquivo MD como uma unidade de conhecimento.
    try {
      console.log(`[Indexer] Processando: ${file}...`);
      const embedding = await EmbeddingGenerator.generate(content);

      const { error } = await supabase
        .from('knowledge')
        .upsert({
          file_name: file,
          content: content,
          embedding: embedding
        }, { onConflict: 'file_name' });

      if (error) throw error;
    } catch (error: any) {
      console.error(`[Indexer] Falha ao indexar ${file}:`, error.message);
    }
  }

  console.log('[Indexer] Indexação concluída com sucesso!');
}

indexAllKnowledge().catch(console.error);
