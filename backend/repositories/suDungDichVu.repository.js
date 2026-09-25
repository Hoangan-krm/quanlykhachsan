import { pool } from '../config/db.js';

export const suDungDichVuRepository = {
  async findByBookingId(bookingId) {
    const [rows] = await pool.execute(
      `SELECT sddv.*, dv.ten_dich_vu, dv.don_gia, dv.don_vi_tinh
       FROM SU_DUNG_DICH_VU sddv
       JOIN DICH_VU dv ON sddv.dich_vu_id = dv.id
       WHERE sddv.dat_phong_id = ?
       ORDER BY sddv.id ASC`,
      [bookingId]
    );
    return rows;
  },

  async insert(data) {
    const [result] = await pool.execute(
      'INSERT INTO SU_DUNG_DICH_VU (dat_phong_id, dich_vu_id, so_luong, thanh_tien) VALUES (?, ?, ?, ?)',
      [data.dat_phong_id, data.dich_vu_id, data.so_luong, data.thanh_tien]
    );
    return { id: result.insertId, ...data };
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM SU_DUNG_DICH_VU WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async sumByBookingId(bookingId) {
    const [rows] = await pool.execute(
      'SELECT COALESCE(SUM(thanh_tien), 0) as total FROM SU_DUNG_DICH_VU WHERE dat_phong_id = ?',
      [bookingId]
    );
    return Number(rows[0].total);
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM SU_DUNG_DICH_VU WHERE id = ?', [id]);
    return rows[0] || null;
  },
};
