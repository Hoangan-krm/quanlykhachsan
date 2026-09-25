import { pool } from '../config/db.js';

export const loaiPhongRepository = {
  async findAll() {
    const [rows] = await pool.execute('SELECT * FROM LOAI_PHONG ORDER BY gia_mac_dinh ASC');
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM LOAI_PHONG WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async insert(data) {
    const [result] = await pool.execute(
      'INSERT INTO LOAI_PHONG (ten_loai_phong, mo_ta, gia_mac_dinh, hinh_anh) VALUES (?, ?, ?, ?)',
      [data.ten_loai_phong, data.mo_ta || null, data.gia_mac_dinh, data.hinh_anh || null]
    );
    return { id: result.insertId, ...data };
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (['ten_loai_phong', 'mo_ta', 'gia_mac_dinh', 'hinh_anh'].includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return false;
    values.push(id);
    const [result] = await pool.execute(`UPDATE LOAI_PHONG SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows > 0;
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM LOAI_PHONG WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async hasRooms(id) {
    const [rows] = await pool.execute('SELECT COUNT(*) as count FROM PHONG WHERE loai_phong_id = ?', [id]);
    return rows[0].count > 0;
  },
};
