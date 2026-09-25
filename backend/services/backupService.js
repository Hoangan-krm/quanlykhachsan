import { pool } from '../config/db.js';
import { auditLogService } from './auditLogService.js';
import { createError } from '../utils/errors.js';
import { mkdir, readFile, writeFile, readdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.resolve(__dirname, '..', '..', 'database', 'backup');

function safeBackupPath(filename) {
  if (!/^[a-zA-Z0-9_.-]+\.json$/.test(filename) || path.basename(filename) !== filename) {
    throw createError('VALIDATION_ERROR', { message: 'Tên tệp sao lưu không hợp lệ' });
  }
  const resolved = path.resolve(BACKUP_DIR, filename);
  if (path.dirname(resolved) !== BACKUP_DIR) throw createError('PERMISSION_DENIED');
  return resolved;
}

async function tableNames(connection = pool) {
  const [rows] = await connection.query('SHOW TABLES');
  return rows.map(row => String(Object.values(row)[0]));
}

function restoreValue(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    return value.slice(0, 19).replace('T', ' ');
  }
  if (value && value.type === 'Buffer' && Array.isArray(value.data)) return Buffer.from(value.data);
  return value;
}

export const backupService = {
  async backup(user = { id: 0, ho_ten: 'System' }) {
    await mkdir(BACKUP_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `hotel_db_${timestamp}.json`;
    const snapshot = { version: 1, created_at: new Date().toISOString(), tables: {} };
    for (const table of await tableNames()) {
      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      snapshot.tables[table] = rows;
    }
    await writeFile(safeBackupPath(filename), JSON.stringify(snapshot, null, 2), 'utf8');
    await auditLogService.log(user, 'backup', `Sao lưu database: ${filename}`);
    return { success: true, file: filename, table_count: Object.keys(snapshot.tables).length };
  },

  async restore(filename, user) {
    const raw = await readFile(safeBackupPath(filename), 'utf8').catch(() => {
      throw createError('NOT_FOUND', { message: 'Không tìm thấy tệp sao lưu' });
    });
    let snapshot;
    try { snapshot = JSON.parse(raw); }
    catch { throw createError('VALIDATION_ERROR', { message: 'Tệp sao lưu không hợp lệ' }); }
    if (snapshot?.version !== 1 || !snapshot.tables || Array.isArray(snapshot.tables)) {
      throw createError('VALIDATION_ERROR', { message: 'Cấu trúc tệp sao lưu không hợp lệ' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      const existingTables = new Set(await tableNames(connection));
      for (const [table, rows] of Object.entries(snapshot.tables)) {
        if (!existingTables.has(table) || !Array.isArray(rows)) {
          throw createError('VALIDATION_ERROR', { message: `Bảng sao lưu không hợp lệ: ${table}` });
        }
        await connection.query(`DELETE FROM \`${table}\``);
        for (const row of rows) {
          const columns = Object.keys(row);
          if (columns.length === 0) continue;
          const placeholders = columns.map(() => '?').join(', ');
          const quotedColumns = columns.map(column => `\`${column.replace(/`/g, '')}\``).join(', ');
          await connection.execute(
            `INSERT INTO \`${table}\` (${quotedColumns}) VALUES (${placeholders})`,
            columns.map(column => restoreValue(row[column]))
          );
        }
      }
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error.code ? error : createError('INTERNAL_ERROR', { message: 'Khôi phục dữ liệu thất bại' });
    } finally {
      try { await connection.query('SET FOREIGN_KEY_CHECKS = 1'); } catch {}
      connection.release();
    }
    await auditLogService.log(user, 'restore', `Khôi phục database từ: ${filename}`);
    return { success: true };
  },

  async list() {
    await mkdir(BACKUP_DIR, { recursive: true });
    return (await readdir(BACKUP_DIR, { withFileTypes: true }))
      .filter(entry => entry.isFile() && /^hotel_db_.+\.json$/.test(entry.name))
      .map(entry => entry.name).sort().reverse();
  },

  async listBackupLogs() {
    const { rows } = await auditLogService.list({ page: 1, limit: 50, offset: 0 });
    return rows.filter(row => row.hanh_dong === 'backup' || row.hanh_dong === 'restore');
  },
};

export { BACKUP_DIR };
