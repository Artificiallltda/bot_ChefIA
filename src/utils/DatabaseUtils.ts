import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

export class DatabaseUtils {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    }

    async initializeTables() {
        const query = "CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, telegram_id BIGINT UNIQUE NOT NULL, name TEXT, email TEXT);";
        await this.pool.query(query);
        console.log('?? Tabelas inicializadas.');
    }
}
