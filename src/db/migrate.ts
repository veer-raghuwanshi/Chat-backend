import fs from 'fs';
import path from 'path';
import { pool, testConnection } from '../config/db';

export async function runMigrations() {
  const isConnected = await testConnection();
  if (!isConnected) return;

  const sqlFile = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('[db] Running schema migrations...');
  await pool.query(sql);
  console.log('[db] Migrations applied successfully');
}

if (require.main === module) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error('[db] Migration error:', err);
      process.exit(1);
    });
}

