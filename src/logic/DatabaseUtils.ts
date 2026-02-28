import { Client } from 'pg';

/**
 * DatabaseUtils.ts
 * Utilitário central para conexões resilientes com PostgreSQL.
 */
export class DatabaseUtils {
  static async executeWithRetry(query: string, params: any[] = [], retries = 3): Promise<any> {
    let lastError;
    
    for (let i = 0; i < retries; i++) {
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      });

      try {
        await client.connect();
        const res = await client.query(query, params);
        await client.end();
        return res;
      } catch (err: any) {
        lastError = err;
        try { await client.end(); } catch (e) {}
        console.log(`[DB] Tentativa ${i + 1} falhou: ${err.message}. Retentando...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    throw lastError;
  }

  /**
   * Inicializa as tabelas básicas do sistema se não existirem.
   */
  static async initializeTables(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS leads (
        user_id TEXT PRIMARY KEY,
        user_name TEXT,
        email TEXT,
        phone TEXT,
        platform TEXT,
        registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS user_states (
        user_id TEXT PRIMARY KEY,
        step TEXT DEFAULT 'START'
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
    `;
    await this.executeWithRetry(query);
  }
}
