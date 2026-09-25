import { pool } from '../config/db.js';

export const datPhongRepository = {
  async findAll({ page, limit, offset, trang_thai, khach_hang_id, phong_id, from, to } = {}) {
    let sql = `SELECT dp.*, p.so_phong, lp.ten_loai_phong, kh.ho_ten as ten_khach, kh.sdt as sdt_khach,
                      (hd.id IS NOT NULL) as co_hoa_don
               FROM DAT_PHONG dp
               JOIN PHONG p ON dp.phong_id = p.id
               JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
               JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id
               LEFT JOIN HOA_DON hd ON hd.dat_phong_id = dp.id`;
    let countSql = 'SELECT COUNT(*) as total FROM DAT_PHONG dp';
    const conditions = [];
    const params = [];
    const countParams = [];

    if (trang_thai) { conditions.push('dp.trang_thai = ?'); params.push(trang_thai); countParams.push(trang_thai); }
    if (khach_hang_id) { conditions.push('dp.khach_hang_id = ?'); params.push(khach_hang_id); countParams.push(khach_hang_id); }
    if (phong_id) { conditions.push('dp.phong_id = ?'); params.push(phong_id); countParams.push(phong_id); }
    if (from) { conditions.push('dp.ngay_check_in >= ?'); params.push(from); countParams.push(from); }
    if (to) { conditions.push('dp.ngay_check_out <= ?'); params.push(to); countParams.push(to); }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
      countSql += ' WHERE ' + conditions.join(' AND ').replace(/dp\./g, '');
    }

    sql += ' ORDER BY dp.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(sql, params);
    const [countResult] = await pool.execute(countSql, countParams);
    return { rows, total: countResult[0].total };
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT dp.*, p.so_phong, p.trang_thai as trang_thai_phong,
              lp.ten_loai_phong, lp.gia_mac_dinh,
              kh.ho_ten as ten_khach, kh.sdt as sdt_khach, kh.email as email_khach,
              kh.cccd_passport, kh.quoc_tich, kh.dia_chi as dia_chi_khach,
              nd.ho_ten as ten_nhan_vien
       FROM DAT_PHONG dp
       JOIN PHONG p ON dp.phong_id = p.id
       JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
       JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id
       LEFT JOIN NGUOI_DUNG nd ON dp.nguoi_dung_id = nd.id
       WHERE dp.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findOverlapping(phongId, checkIn, checkOut, excludeId = null) {
    let sql = `SELECT id FROM DAT_PHONG
               WHERE phong_id = ?
                 AND trang_thai IN ('ChoXacNhan','DaDat','DangO')
                 AND ngay_check_in < ?
                 AND ngay_check_out > ?`;
    const params = [phongId, checkOut, checkIn];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  async insert(data) {
    const [result] = await pool.execute(
      `INSERT INTO DAT_PHONG (khach_hang_id, phong_id, nguoi_dung_id, ngay_check_in, ngay_check_out, tien_coc, trang_thai, ma_giam_gia_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.khach_hang_id, data.phong_id, data.nguoi_dung_id || null,
       data.ngay_check_in, data.ngay_check_out, data.tien_coc || 0,
       data.trang_thai || 'ChoXacNhan', data.ma_giam_gia_id || null]
    );
    return { id: result.insertId, ...data };
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (['khach_hang_id', 'phong_id', 'nguoi_dung_id', 'ngay_check_in', 'ngay_check_out', 'tien_coc', 'trang_thai', 'thoi_gian_check_in_thuc', 'ma_giam_gia_id'].includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return false;
    values.push(id);
    const [result] = await pool.execute(`UPDATE DAT_PHONG SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows > 0;
  },

  async updateStatus(id, trangThai) {
    const [result] = await pool.execute('UPDATE DAT_PHONG SET trang_thai = ? WHERE id = ?', [trangThai, id]);
    return result.affectedRows > 0;
  },

  async setCheckInTime(id, timestamp) {
    const [result] = await pool.execute(
      'UPDATE DAT_PHONG SET thoi_gian_check_in_thuc = ? WHERE id = ?',
      [timestamp, id]
    );
    return result.affectedRows > 0;
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM DAT_PHONG WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async findByCustomerId(customerId) {
    const [rows] = await pool.execute(
      `SELECT dp.*, p.so_phong, lp.ten_loai_phong
       FROM DAT_PHONG dp
       JOIN PHONG p ON dp.phong_id = p.id
       JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
       WHERE dp.khach_hang_id = ?
       ORDER BY dp.created_at DESC`,
      [customerId]
    );
    return rows;
  },

  // Danh sách đặt phòng của khách kèm dữ liệu hiển thị trên website (US-42):
  // hóa đơn, tổng đã thanh toán, đã đánh giá — gộp 1 query tránh N+1.
  async findByCustomerIdWithDetails(customerId) {
    const [rows] = await pool.execute(
      `SELECT dp.*, p.so_phong, lp.ten_loai_phong, lp.hinh_anh, lp.gia_mac_dinh,
              hd.id AS invoice_id, hd.tong_cong AS invoice_tong_cong, hd.trang_thai_thanh_toan AS invoice_trang_thai,
              (SELECT COALESCE(SUM(tt.so_tien), 0) FROM THANH_TOAN tt WHERE tt.hoa_don_id = hd.id) AS tong_da_thanh_toan,
              (SELECT COUNT(*) FROM DANH_GIA dg WHERE dg.dat_phong_id = dp.id) AS so_danh_gia
       FROM DAT_PHONG dp
       JOIN PHONG p ON dp.phong_id = p.id
       JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
       LEFT JOIN HOA_DON hd ON hd.dat_phong_id = dp.id
       WHERE dp.khach_hang_id = ?
       ORDER BY dp.ngay_check_in DESC, dp.id DESC`,
      [customerId]
    );
    return rows.map(r => ({
      ...r,
      invoice: r.invoice_id
        ? { id: r.invoice_id, tong_cong: Number(r.invoice_tong_cong), trang_thai_thanh_toan: r.invoice_trang_thai }
        : null,
      tong_da_thanh_toan: Number(r.tong_da_thanh_toan || 0),
      reviewed: Number(r.so_danh_gia || 0) > 0,
    }));
  },

  async countByStatus() {
    const [rows] = await pool.execute(
      'SELECT trang_thai, COUNT(*) as count FROM DAT_PHONG GROUP BY trang_thai'
    );
    return rows;
  },

  async findTodayArrivals() {
    const [rows] = await pool.execute(
      `SELECT dp.*, p.so_phong, lp.ten_loai_phong, kh.ho_ten as ten_khach, kh.sdt as sdt_khach
       FROM DAT_PHONG dp
       JOIN PHONG p ON dp.phong_id = p.id
       JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
       JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id
       WHERE dp.ngay_check_in = CURDATE()
         AND dp.trang_thai IN ('ChoXacNhan','DaDat')
       ORDER BY dp.ngay_check_in ASC`
    );
    return rows;
  },

  async findTodayDepartures() {
    const [rows] = await pool.execute(
      `SELECT dp.*, p.so_phong, lp.ten_loai_phong, kh.ho_ten as ten_khach, kh.sdt as sdt_khach
       FROM DAT_PHONG dp
       JOIN PHONG p ON dp.phong_id = p.id
       JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
       JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id
       WHERE dp.ngay_check_out = CURDATE()
         AND dp.trang_thai = 'DangO'
       ORDER BY dp.ngay_check_out ASC`
    );
    return rows;
  },
};
