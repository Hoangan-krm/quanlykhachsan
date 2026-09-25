import { pool } from '../config/db.js';

export const hotelConfigRepository = {
  async get() {
    const [rows] = await pool.execute('SELECT * FROM HOTEL_CONFIG WHERE id = 1');
    return rows[0] || null;
  },

  async update(data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (['ten_khach_san', 'dia_chi', 'vat', 'check_in_time', 'check_out_time', 'logo', 'ma_hoa_don_mau', 'no_show_deposit_policy', 'phi_tra_muon', 'nguong_duyet_hoan_tien'].includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return false;
    const [result] = await pool.execute(`UPDATE HOTEL_CONFIG SET ${fields.join(', ')} WHERE id = 1`, values);
    return result.affectedRows > 0;
  },
};
