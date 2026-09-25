import { pool } from '../config/db.js';

export const hoaDonRepository = {
  async findAll({ page, limit, offset, trang_thai_thanh_toan } = {}) {
    let sql = `SELECT hd.*, dp.phong_id, p.so_phong, kh.ho_ten as ten_khach
               FROM HOA_DON hd
               JOIN DAT_PHONG dp ON hd.dat_phong_id = dp.id
               JOIN PHONG p ON dp.phong_id = p.id
               JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id`;
    let countSql = 'SELECT COUNT(*) as total FROM HOA_DON';
    const conditions = [];
    const params = [];
    const countParams = [];

    if (trang_thai_thanh_toan) {
      conditions.push('hd.trang_thai_thanh_toan = ?');
      params.push(trang_thai_thanh_toan);
      countParams.push(trang_thai_thanh_toan);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
      countSql += ' WHERE ' + conditions.join(' AND ').replace(/hd\./g, '');
    }

    sql += ' ORDER BY hd.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(sql, params);
    const [countResult] = await pool.execute(countSql, countParams);
    return { rows, total: countResult[0].total };
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT hd.*, dp.phong_id, dp.khach_hang_id, dp.ngay_check_in, dp.ngay_check_out, dp.tien_coc,
              p.so_phong, lp.ten_loai_phong, lp.gia_mac_dinh,
              kh.ho_ten as ten_khach, kh.sdt as sdt_khach, kh.email as email_khach, kh.cccd_passport
       FROM HOA_DON hd
       JOIN DAT_PHONG dp ON hd.dat_phong_id = dp.id
       JOIN PHONG p ON dp.phong_id = p.id
       JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
       JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id
       WHERE hd.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByBookingId(bookingId) {
    const [rows] = await pool.execute('SELECT * FROM HOA_DON WHERE dat_phong_id = ?', [bookingId]);
    return rows[0] || null;
  },

  async insert(data) {
    const [result] = await pool.execute(
      `INSERT INTO HOA_DON (dat_phong_id, tong_tien_phong, tong_tien_dich_vu, thue_vat, tong_cong, trang_thai_thanh_toan)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.dat_phong_id, data.tong_tien_phong, data.tong_tien_dich_vu,
       data.thue_vat, data.tong_cong, data.trang_thai_thanh_toan || 'ChuaThanhToan']
    );
    return { id: result.insertId, ...data };
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (['tong_tien_phong', 'tong_tien_dich_vu', 'thue_vat', 'tong_cong', 'trang_thai_thanh_toan'].includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return false;
    values.push(id);
    const [result] = await pool.execute(`UPDATE HOA_DON SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows > 0;
  },

  async updatePaymentStatus(id, trangThai) {
    const [result] = await pool.execute(
      'UPDATE HOA_DON SET trang_thai_thanh_toan = ? WHERE id = ?',
      [trangThai, id]
    );
    return result.affectedRows > 0;
  },
};
