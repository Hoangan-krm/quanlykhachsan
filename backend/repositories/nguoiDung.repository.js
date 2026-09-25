import { pool } from '../config/db.js';

export const nguoiDungRepository = {
  async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT * FROM NGUOI_DUNG WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, ho_ten, email, vai_tro, trang_thai, so_lan_sai, created_at FROM NGUOI_DUNG WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async findAll({ page, limit, offset, vai_tro }) {
    let sql = 'SELECT id, ho_ten, email, vai_tro, trang_thai, so_lan_sai, created_at FROM NGUOI_DUNG';
    let countSql = 'SELECT COUNT(*) as total FROM NGUOI_DUNG';
    const params = [];
    const countParams = [];

    if (vai_tro) {
      sql += ' WHERE vai_tro = ?';
      countSql += ' WHERE vai_tro = ?';
      params.push(vai_tro);
      countParams.push(vai_tro);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(sql, params);
    const [countResult] = await pool.execute(countSql, countParams);
    return { rows, total: countResult[0].total };
  },

  async insert(data) {
    const [result] = await pool.execute(
      'INSERT INTO NGUOI_DUNG (ho_ten, email, mat_khau_hash, vai_tro, trang_thai, so_lan_sai) VALUES (?, ?, ?, ?, ?, ?)',
      [data.ho_ten, data.email, data.mat_khau_hash, data.vai_tro, data.trang_thai || 'Active', 0]
    );
    return { id: result.insertId, ...data };
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    const allowedFields = ['ho_ten', 'email', 'mat_khau_hash', 'vai_tro', 'trang_thai', 'so_lan_sai'];
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return false;
    values.push(id);
    const [result] = await pool.execute(`UPDATE NGUOI_DUNG SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows > 0;
  },

  async updateLockout(id, soLanSai, trangThai) {
    const [result] = await pool.execute(
      'UPDATE NGUOI_DUNG SET so_lan_sai = ?, trang_thai = ? WHERE id = ?',
      [soLanSai, trangThai, id]
    );
    return result.affectedRows > 0;
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM NGUOI_DUNG WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async emailExists(email, excludeId = null) {
    if (excludeId) {
      const [rows] = await pool.execute('SELECT id FROM NGUOI_DUNG WHERE email = ? AND id != ?', [email, excludeId]);
      return rows.length > 0;
    }
    const [rows] = await pool.execute('SELECT id FROM NGUOI_DUNG WHERE email = ?', [email]);
    return rows.length > 0;
  },
};
