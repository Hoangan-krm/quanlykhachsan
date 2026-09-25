import { pool } from '../config/db.js';

export const maGiamGiaRepository = {
  async findAll() {
    const [rows] = await pool.execute('SELECT * FROM MA_GIAM_GIA ORDER BY id ASC');
    return rows;
  },

  async findByCode(code) {
    const [rows] = await pool.execute('SELECT * FROM MA_GIAM_GIA WHERE ma = ?', [code]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM MA_GIAM_GIA WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async insert(data) {
    const [result] = await pool.execute(
      `INSERT INTO MA_GIAM_GIA (ma, phan_tram, ngay_bat_dau, ngay_ket_thuc, gioi_han_su_dung, gia_tri_toi_thieu, trang_thai)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.ma, data.phan_tram, data.ngay_bat_dau || null, data.ngay_ket_thuc || null,
       data.gioi_han_su_dung ?? null, data.gia_tri_toi_thieu ?? null, data.trang_thai || 'Active']
    );
    return { id: result.insertId, ...data };
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (['ma', 'phan_tram', 'ngay_bat_dau', 'ngay_ket_thuc', 'gioi_han_su_dung', 'gia_tri_toi_thieu', 'trang_thai'].includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value === '' ? null : value);
      }
    }
    if (fields.length === 0) return false;
    values.push(id);
    const [result] = await pool.execute(`UPDATE MA_GIAM_GIA SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows > 0;
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM MA_GIAM_GIA WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },
};
