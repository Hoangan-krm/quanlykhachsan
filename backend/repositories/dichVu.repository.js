import { pool } from '../config/db.js';

export const dichVuRepository = {
  async findAll({ page, limit, offset } = {}) {
    if (page != null && limit != null) {
      const [rows] = await pool.execute('SELECT * FROM DICH_VU ORDER BY ten_dich_vu ASC LIMIT ? OFFSET ?', [limit, offset]);
      const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM DICH_VU');
      return { rows, total: countResult[0].total };
    }
    const [rows] = await pool.execute('SELECT * FROM DICH_VU ORDER BY ten_dich_vu ASC');
    return rows;
  },

  async findActive() {
    const [rows] = await pool.execute("SELECT * FROM DICH_VU WHERE trang_thai = 'Active' ORDER BY ten_dich_vu ASC");
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM DICH_VU WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async insert(data) {
    const [result] = await pool.execute(
      'INSERT INTO DICH_VU (ten_dich_vu, don_gia, don_vi_tinh, trang_thai) VALUES (?, ?, ?, ?)',
      [data.ten_dich_vu, data.don_gia, data.don_vi_tinh, data.trang_thai || 'Active']
    );
    return { id: result.insertId, ...data };
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (['ten_dich_vu', 'don_gia', 'don_vi_tinh', 'trang_thai'].includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return false;
    values.push(id);
    const [result] = await pool.execute(`UPDATE DICH_VU SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows > 0;
  },

  async updateStatus(id, trangThai) {
    const [result] = await pool.execute('UPDATE DICH_VU SET trang_thai = ? WHERE id = ?', [trangThai, id]);
    return result.affectedRows > 0;
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM DICH_VU WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async isUsedInBookings(id) {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM SU_DUNG_DICH_VU WHERE dich_vu_id = ?', [id]);
    return rows[0].count > 0;
  },
};
