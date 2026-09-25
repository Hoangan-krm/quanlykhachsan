import { createDB } from 'mysql-memory-server';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SCHEMA_PATH = resolve(ROOT, '..', 'database', 'schema.sql');
const SEED_PATH = resolve(ROOT, '..', 'database', 'seed.sql');

async function startDevServer() {
  console.log('[DEV] Booting mysql-memory-server...');
  const db = await createDB({ version: '8.0.41', username: 'root', logLevel: 'ERROR' });

  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = String(db.port);
  process.env.DB_USER = db.username;
  process.env.DB_PASSWORD = '';
  process.env.DB_NAME = 'hotel_db';
  process.env.NODE_ENV = 'development';
  process.env.PORT = '3000';
  process.env.JWT_SECRET = process.env.JWT_SECRET || randomBytes(48).toString('hex');
  process.env.JWT_EXPIRES_IN_STAFF = '8h';
  process.env.JWT_EXPIRES_IN_CUSTOMER = '2h';
  process.env.BCRYPT_ROUNDS = '12';
  process.env.CORS_ORIGIN = 'http://localhost:3000';

  console.log(`[DEV] MySQL memory server on port ${db.port}`);

  console.log('[DEV] Loading schema...');
  const schemaConn = await mysql.createConnection({
    host: 'localhost',
    port: db.port,
    user: db.username,
    multipleStatements: true,
  });
  const schema = readFileSync(SCHEMA_PATH, 'utf8');
  await schemaConn.query(schema);
  console.log('[DEV] Schema loaded.');

  console.log('[DEV] Loading seed data...');
  const seedRaw = readFileSync(SEED_PATH, 'utf8');
  const seedPatched = seedRaw.replace(/TRUNCATE TABLE/gi, 'DELETE FROM');
  await schemaConn.query(seedPatched);
  await schemaConn.end();
  console.log('[DEV] Seed data loaded.');

  console.log('[DEV] Starting Express server (via server.js import)...');
  // server.js chỉ tự start khi chạy trực tiếp — khi import phải gọi startServer().
  const server = await import('../server.js');
  await server.startServer();
  console.log('[DEV] ========================================');
  console.log('[DEV]  Server running at http://localhost:3000');
  console.log('[DEV]  Frontend: http://localhost:3000/');
  console.log('[DEV]  API:     http://localhost:3000/api/');
  console.log('[DEV] ========================================');
}

startDevServer().catch(err => {
  console.error('[DEV] Failed to start:', err);
  process.exit(1);
});
