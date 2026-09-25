import { pool, withTransaction } from '../config/db.js';

function buildWhereClause(conditions = {}) {
  const entries = Object.entries(conditions).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) return { clause: '', params: [] };
  const clauses = entries.map(([key, value]) => {
    if (Array.isArray(value)) {
      return `${key} IN (${value.map(() => '?').join(', ')})`;
    }
    return `${key} = ?`;
  });
  const params = entries.flatMap(([, value]) => Array.isArray(value) ? value : [value]);
  return { clause: `WHERE ${clauses.join(' AND ')}`, params };
}

function buildOrderBy(orderBy) {
  if (!orderBy) return '';
  if (typeof orderBy === 'string') return `ORDER BY ${orderBy}`;
  return '';
}

export const baseRepository = {
  async findAll(table, { where, orderBy, limit, offset } = {}) {
    const { clause, params } = buildWhereClause(where);
    const orderClause = buildOrderBy(orderBy);
    const limitClause = limit !== undefined ? `LIMIT ? OFFSET ?` : '';
    const sql = `SELECT * FROM ${table} ${clause} ${orderClause} ${limitClause}`.trim();
    const allParams = [...params];
    if (limit !== undefined) {
      allParams.push(limit, offset || 0);
    }
    const [rows] = await pool.execute(sql, allParams);
    return rows;
  },

  async findById(table, id) {
    const [rows] = await pool.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const [result] = await pool.execute(sql, values);
    return { id: result.insertId, ...data };
  },

  async update(table, id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const [result] = await pool.execute(sql, [...values, id]);
    return result.affectedRows > 0;
  },

  async remove(table, id) {
    const [result] = await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  },

  async count(table, where = {}) {
    const { clause, params } = buildWhereClause(where);
    const sql = `SELECT COUNT(*) as total FROM ${table} ${clause}`.trim();
    const [rows] = await pool.execute(sql, params);
    return rows[0].total;
  },

  async exists(table, where) {
    const count = await this.count(table, where);
    return count > 0;
  },

  async rawQuery(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
  },
};

export { withTransaction, pool };
