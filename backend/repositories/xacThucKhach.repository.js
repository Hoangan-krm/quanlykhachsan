import { pool } from '../config/db.js';
import { createHash } from 'node:crypto';

const hash = token => createHash('sha256').update(token).digest('hex');

// Token lưu dạng hash (giống PASSWORD_RESET): DB lộ cũng không dùng được link.
export const xacThucKhachRepository = {
  async create(khachHangId, token, expiresHours = 24) {
    await pool.execute(
      'INSERT INTO XAC_THUC_KHACH (token_hash, khach_hang_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))',
      [hash(token), khachHangId, expiresHours]
    );
    return token;
  },

  // Trả về khach_hang_id nếu token hợp lệ; đánh dấu đã dùng (dùng một lần).
  async consume(token) {
    const [rows] = await pool.execute('SELECT khach_hang_id, expires_at, used_at FROM XAC_THUC_KHACH WHERE token_hash = ?', [hash(token)]);
    const row = rows[0];
    if (!row || row.used_at || new Date(row.expires_at) < new Date()) return null;
    await pool.execute('UPDATE XAC_THUC_KHACH SET used_at = NOW() WHERE token_hash = ?', [hash(token)]);
    return row.khach_hang_id;
  },
};
