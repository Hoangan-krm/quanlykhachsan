import { pool } from '../config/db.js';

export const khachHangRepository = {
  async findAll({ page, limit, offset, q } = {}) {
    let sql = 'SELECT id, ho_ten, sdt, email, cccd_passport, quoc_tich, dia_chi, ghi_chu, created_at FROM KHACH_HANG';
    let countSql = 'SELECT COUNT(*) as total FROM KHACH_HANG';
    const conditions = [];
    const params = [];
    const countParams = [];

    if (q) {
      conditions.push('(ho_ten LIKE ? OR sdt LIKE ? OR email LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
      countParams.push(like, like, like);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
      countSql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(sql, params);
    const [countResult] = await pool.execute(countSql, countParams);
    return { rows, total: countResult[0].total };
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM KHACH_HANG WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findByCccd(cccd) {
    const [rows] = await pool.execute('SELECT * FROM KHACH_HANG WHERE cccd_passport = ?', [cccd]);
    return rows[0] || null;
  },

  async findByEmail(email) {
    const [rows] = await pool.execute('SELECT * FROM KHACH_HANG WHERE email = ?', [email]);
    return rows[0] || null;
  },

  // Đăng nhập website cho phép dùng email hoặc số điện thoại (US-35/US-36).
  async findByEmailOrPhone(identity) {
    const [rows] = await pool.execute('SELECT * FROM KHACH_HANG WHERE email = ? OR sdt = ? LIMIT 1', [identity, identity]);
    return rows[0] || null;
  },

  async search(q) {
    const [rows] = await pool.execute(
      `SELECT id, ho_ten, sdt, email, cccd_passport, quoc_tich, dia_chi
       FROM KHACH_HANG
       WHERE sdt = ? OR ho_ten LIKE ?
       ORDER BY ho_ten ASC LIMIT 50`,
      [q, `%${q}%`]
    );
    return rows;
  },

  async insert(data) {
    const [result] = await pool.execute(
      `INSERT INTO KHACH_HANG (ho_ten, sdt, email, cccd_passport, quoc_tich, dia_chi, ghi_chu, mat_khau_hash, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.ho_ten, data.sdt, data.email || null, data.cccd_passport,
       data.quoc_tich || 'Việt Nam', data.dia_chi || null, data.ghi_chu || null, data.mat_khau_hash || null,
       data.email_verified === true ? 1 : 0]
    );
    return { id: result.insertId, ...data };
  },

  // Khóa/mở tài khoản + đếm lần sai (chính sách như nhân viên).
  async setLockout(id, soLanSai, trangThai) {
    await pool.execute('UPDATE KHACH_HANG SET so_lan_sai = ?, trang_thai = ? WHERE id = ?', [soLanSai, trangThai, id]);
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (['ho_ten', 'sdt', 'email', 'cccd_passport', 'quoc_tich', 'dia_chi', 'ghi_chu', 'mat_khau_hash', 'email_verified', 'trang_thai'].includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(key === 'email_verified' ? (value ? 1 : 0) : value);
      }
    }
    if (fields.length === 0) return false;
    values.push(id);
    const [result] = await pool.execute(`UPDATE KHACH_HANG SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows > 0;
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM KHACH_HANG WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async hasActiveBooking(id) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM DAT_PHONG
       WHERE khach_hang_id = ? AND trang_thai IN ('ChoXacNhan','DaDat','DangO')`,
      [id]
    );
    return rows[0].count > 0;
  },

  async cccdExists(cccd, excludeId = null) {
    if (excludeId) {
      const [rows] = await pool.execute('SELECT id FROM KHACH_HANG WHERE cccd_passport = ? AND id != ?', [cccd, excludeId]);
      return rows.length > 0;
    }
    const [rows] = await pool.execute('SELECT id FROM KHACH_HANG WHERE cccd_passport = ?', [cccd]);
    return rows.length > 0;
  },
};
