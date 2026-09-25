import { pool } from '../config/db.js';

export const thanhToanRepository = {
  async findByInvoiceId(invoiceId) {
    const [rows] = await pool.execute(
      'SELECT * FROM THANH_TOAN WHERE hoa_don_id = ? ORDER BY thoi_gian ASC',
      [invoiceId]
    );
    return rows;
  },

  // Sổ thanh toán toàn hệ thống (trang Thanh toán) — một truy vấn thay N+1.
  async findAllWithFilters({ page, limit, offset, hinh_thuc, from, to } = {}) {
    let sql = `SELECT tt.*, hd.dat_phong_id, hd.tong_cong AS invoice_total,
                      kh.ho_ten AS ten_khach, p.so_phong, nd.ho_ten AS ten_nhan_vien
               FROM THANH_TOAN tt
               JOIN HOA_DON hd ON tt.hoa_don_id = hd.id
               JOIN DAT_PHONG dp ON hd.dat_phong_id = dp.id
               JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id
               JOIN PHONG p ON dp.phong_id = p.id
               LEFT JOIN NGUOI_DUNG nd ON tt.nguoi_dung_id = nd.id`;
    let countSql = `SELECT COUNT(*) as total
               FROM THANH_TOAN tt
               JOIN HOA_DON hd ON tt.hoa_don_id = hd.id
               JOIN DAT_PHONG dp ON hd.dat_phong_id = dp.id
               JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id
               JOIN PHONG p ON dp.phong_id = p.id`;
    const conditions = [];
    const params = [];
    if (hinh_thuc) { conditions.push('tt.hinh_thuc = ?'); params.push(hinh_thuc); }
    if (from) { conditions.push('tt.thoi_gian >= ?'); params.push(from); }
    if (to) { conditions.push('tt.thoi_gian <= ?'); params.push(to); }
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
      countSql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY tt.thoi_gian DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    const [rows] = await pool.execute(sql, params);
    const [countResult] = await pool.execute(countSql, params.slice(0, params.length - 2));
    return { rows, total: countResult[0].total };
  },

  async insert(data) {
    const [result] = await pool.execute(
      'INSERT INTO THANH_TOAN (hoa_don_id, so_tien, hinh_thuc, ghi_chu) VALUES (?, ?, ?, ?)',
      [data.hoa_don_id, data.so_tien, data.hinh_thuc, data.ghi_chu || null]
    );
    return { id: result.insertId, ...data };
  },

  async sumByInvoiceId(invoiceId) {
    const [rows] = await pool.execute(
      'SELECT COALESCE(SUM(so_tien), 0) as total FROM THANH_TOAN WHERE hoa_don_id = ?',
      [invoiceId]
    );
    return Number(rows[0].total);
  },

  async findCashInPeriod(from, to) {
    const [rows] = await pool.execute(
      `SELECT COALESCE(SUM(so_tien), 0) as total
       FROM THANH_TOAN
       WHERE hinh_thuc = 'TienMat'
         AND thoi_gian >= ? AND thoi_gian <= ?`,
      [from, to]
    );
    return Number(rows[0].total);
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM THANH_TOAN WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findTodayTotal() {
    const [rows] = await pool.execute(
      `SELECT COALESCE(SUM(so_tien), 0) as total
       FROM THANH_TOAN
       WHERE DATE(thoi_gian) = CURDATE()`
    );
    return Number(rows[0].total);
  },

  async findRevenueByPeriod(from, to, groupBy = 'day') {
    const dateFormat = groupBy === 'month' ? '%Y-%m' : groupBy === 'year' ? '%Y' : '%Y-%m-%d';
    const fromDate = String(from).length === 10 ? `${from} 00:00:00` : from;
    const toDate = String(to).length === 10 ? `${to} 23:59:59` : to;
    const [rows] = await pool.execute(
      `SELECT DATE_FORMAT(thoi_gian, ?) as period, SUM(so_tien) as revenue
       FROM THANH_TOAN
       WHERE thoi_gian >= ? AND thoi_gian <= ?
       GROUP BY period ORDER BY period ASC`,
      [dateFormat, fromDate, toDate]
    );
    return rows;
  },
};
