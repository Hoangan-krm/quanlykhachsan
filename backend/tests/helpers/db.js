import mysql from 'mysql2/promise';
import { bootEnvironment } from './env.js';

let _pool = null;

async function getPool() {
  if (_pool) return _pool;
  const env = await bootEnvironment();
  _pool = mysql.createPool({
    host: env.host,
    port: env.port,
    user: env.user,
    password: '',
    database: 'hotel_db',
    connectionLimit: 10,
    waitForConnections: true,
    charset: 'utf8mb4',
    timezone: '+07:00',
  });
  return _pool;
}

export async function query(sql, params = []) {
  const pool = await getPool();
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function queryRaw(sql, params = []) {
  const pool = await getPool();
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function scalar(sql, params = []) {
  const rows = await queryRaw(sql, params);
  return Object.values(rows[0])[0];
}

export async function getTable(table) {
  return queryRaw(`SELECT * FROM \`${table}\``);
}

export async function findRow(table, conditions) {
  const keys = Object.keys(conditions);
  const where = keys.map(k => `\`${k}\` = ?`).join(' AND ');
  const params = Object.values(conditions);
  const rows = await queryRaw(`SELECT * FROM \`${table}\` WHERE ${where} LIMIT 1`, params);
  return rows[0] || null;
}

export async function assertRowExists(table, conditions) {
  const row = await findRow(table, conditions);
  if (!row) throw new Error(`Expected row in ${table} matching ${JSON.stringify(conditions)}`);
  return row;
}

export async function assertRowNotExists(table, conditions) {
  const row = await findRow(table, conditions);
  if (row) throw new Error(`Did NOT expect row in ${table} matching ${JSON.stringify(conditions)}`);
}

export async function assertRowCount(table, expected) {
  const count = await scalar(`SELECT COUNT(*) AS c FROM \`${table}\``);
  if (Number(count) !== Number(expected)) {
    throw new Error(`Expected ${table} count = ${expected}, got ${count}`);
  }
  return count;
}

export async function closePool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
