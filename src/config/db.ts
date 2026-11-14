import { Pool, PoolConfig, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isSsl = process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('sslmode=require') || process.env.DATABASE_URL.includes('neon.tech'));

const poolConfig: PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host: process.env.PG_HOST || 'localhost',
      port: Number(process.env.PG_PORT) || 5432,
      database: process.env.PG_DATABASE || 'chat_backend',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgrespassword',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

export const pool = new Pool(poolConfig);

let isConnected = false;

export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    isConnected = true;
    console.log('[db] Connected to PostgreSQL');
    return true;
  } catch (err: any) {
    isConnected = false;
    console.warn(`[db] PostgreSQL connection notice: ${err.message}`);
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  return pool.query<T>(text, params);
}
