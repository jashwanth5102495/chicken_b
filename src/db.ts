import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Connect to local PostgreSQL instance
const connectionString =
  process.env.DATABASE_URL || 'postgres://krabets:root@localhost:5432/chickenlink';

const isRemoteDb =
  Boolean(process.env.DATABASE_URL) &&
  !process.env.DATABASE_URL?.includes('localhost') &&
  !process.env.DATABASE_URL?.includes('127.0.0.1');

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Error] Unexpected client error:', err.message);
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log(`[SQL Query] took ${duration}ms: ${text.slice(0, 80)}`);
  return res;
};

export const testConnection = async (): Promise<boolean> => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('[PostgreSQL Connected] Server time:', res.rows[0].now);
    return true;
  } catch (err: any) {
    console.error('[PostgreSQL Connection Failed]:', err.message);
    return false;
  }
};
