import { createHash, createHmac } from 'node:crypto';
import { pool } from '../config/db.js';
import { JWT_SECRET } from '../config/jwt.js';

export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export const credentialVersion = hash => createHmac('sha256', JWT_SECRET).update(hash || '').digest('hex');

export const authStateRepository = {
  async isRevoked(token) {
    const [rows] = await pool.execute('SELECT token_hash FROM AUTH_REVOKED_TOKEN WHERE token_hash = ? AND expires_at > NOW()', [tokenHash(token)]);
    return rows.length > 0;
  },
  async revoke(token, expiresAt) {
    await pool.execute('INSERT IGNORE INTO AUTH_REVOKED_TOKEN (token_hash, expires_at) VALUES (?, ?)', [tokenHash(token), new Date(expiresAt * 1000)]);
  },
  async createReset(userId, token) {
    await pool.execute('DELETE FROM PASSWORD_RESET WHERE nguoi_dung_id = ?', [userId]);
    await pool.execute('INSERT INTO PASSWORD_RESET (token_hash, nguoi_dung_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))', [tokenHash(token), userId]);
  },
  async consumeReset(token, passwordHash) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute('SELECT nguoi_dung_id FROM PASSWORD_RESET WHERE token_hash = ? AND expires_at > NOW() AND used_at IS NULL FOR UPDATE', [tokenHash(token)]);
      if (!rows.length) { await conn.rollback(); return null; }
      const userId = rows[0].nguoi_dung_id;
      await conn.execute('UPDATE NGUOI_DUNG SET mat_khau_hash = ?, so_lan_sai = 0 WHERE id = ?', [passwordHash, userId]);
      await conn.execute('UPDATE PASSWORD_RESET SET used_at = NOW() WHERE token_hash = ?', [tokenHash(token)]);
      await conn.commit();
      return userId;
    } catch (error) { await conn.rollback(); throw error; }
    finally { conn.release(); }
  },
};
