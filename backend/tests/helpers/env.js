import { createDB } from 'mysql-memory-server';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const SCHEMA_PATH = resolve(ROOT, 'database', 'schema.sql');
const SEED_PATH = resolve(ROOT, 'database', 'seed.sql');

let _state = null;
let _booting = null;

async function runSchemaSeed(db) {
  const conn = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.username,
    multipleStatements: true,
  });
  try {
    const schema = readFileSync(SCHEMA_PATH, 'utf8');
    const seed = readFileSync(SEED_PATH, 'utf8');
    await conn.query(schema);
    await conn.query(seed);
  } finally {
    await conn.end();
  }
}

async function truncateAndSeed(db) {
  const conn = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.username,
    database: 'hotel_db',
    multipleStatements: true,
  });
  try {
    const tables = [
      'TIN_NHAN', 'CUOC_TRO_CHUYEN', 'NHAT_KY', 'DANH_GIA', 'THANH_TOAN', 'HOA_DON',
      'LICH_SU_PHONG', 'SU_DUNG_DICH_VU', 'CA_LAM_VIEC', 'MA_GIAM_GIA', 'DAT_PHONG', 'KHACH_HANG',
      'DICH_VU', 'PHONG', 'LOAI_PHONG', 'NGUOI_DUNG', 'HOTEL_CONFIG',
    ];
    await conn.query('SET FOREIGN_KEY_CHECKS=0');
    for (const t of tables) {
      await conn.query(`DELETE FROM \`${t}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS=1');
    const seedRaw = readFileSync(SEED_PATH, 'utf8');
    const seedPatched = seedRaw.replace(/TRUNCATE TABLE/gi, 'DELETE FROM');
    await conn.query(seedPatched);
  } finally {
    await conn.end();
  }
}

export async function bootEnvironment() {
  if (_state) return _state;
  if (_booting) return _booting;
  _booting = (async () => {
    const db = await createDB({ version: '8.0.28', username: 'root', logLevel: 'ERROR' });
    const host = 'localhost';
    process.env.DB_HOST = host;
    process.env.DB_PORT = String(db.port);
    process.env.DB_USER = db.username;
    process.env.DB_PASSWORD = '';
    process.env.DB_NAME = 'hotel_db';
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-32-chars-min!!';
    await runSchemaSeed({ host, port: db.port, username: db.username });
    const { default: app } = await import('../../server.js');
    _state = { app, db, host, port: db.port, user: db.username };
    _booting = null;
    return _state;
  })();
  return _booting;
}

export async function resetDatabase() {
  if (!_state) {
    await bootEnvironment();
    return;
  }
  await truncateAndSeed({ host: _state.host, port: _state.port, username: _state.user });
}

export async function shutdownEnvironment() {
  if (_state) {
    try {
      const { pool } = await import('../../config/db.js');
      await pool.end();
    } catch { /* ignore */ }
    try { await _state.db.stop(); } catch { /* ignore */ }
    _state = null;
  }
}

export function getState() { return _state; }
export function getApp() { return _state?.app; }
