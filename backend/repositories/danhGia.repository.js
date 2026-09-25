import { pool } from '../config/db.js';

export const danhGiaRepository = {
  async findAll({ page, limit, offset, trang_thai_duyet } = {}) {
    let sql = `SELECT dg.*, kh.ho_ten as ten_khach, dp.phong_id, p.so_phong
               FROM DANH_GIA dg
               JOIN KHACH_HANG kh ON dg.khach_hang_id = kh.id
               JOIN DAT_PHONG dp ON dg.dat_phong_id = dp.id
               JOIN PHONG p ON dp.phong_id = p.id`;
    let countSql = 'SELECT COUNT(*) as total FROM DANH_GIA';
    const conditions = [];
    const params = [];
    const countParams = [];

    if (trang_thai_duyet) {
      conditions.push('dg.trang_thai_duyet = ?');
      params.push(trang_thai_duyet);
      countParams.push(trang_thai_duyet);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
      countSql += ' WHERE ' + conditions.join(' AND ').replace(/dg\./g, '');
    }

    sql += ' ORDER BY dg.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(sql, params);
    const [countResult] = await pool.execute(countSql, countParams);
    return { rows, total: countResult[0].total };
  },

  async findPublic() {
    const [rows] = await pool.execute(
      `SELECT dg.*, kh.ho_ten as ten_khach
       FROM DANH_GIA dg
       JOIN KHACH_HANG kh ON dg.khach_hang_id = kh.id
       WHERE dg.trang_thai_duyet = 'DaDuyet'
       ORDER BY dg.created_at DESC`
    );
    return rows;
  },

  async findByCustomerId(customerId) {
    const [rows] = await pool.execute(
      'SELECT * FROM DANH_GIA WHERE khach_hang_id = ? ORDER BY created_at DESC',
      [customerId]
    );
    return rows;
  },

  async insert(data) {
    const trangThaiDuyet = data.trang_thai_duyet || 'ChoDuyet';
    const [result] = await pool.execute(
      'INSERT INTO DANH_GIA (khach_hang_id, dat_phong_id, so_sao, noi_dung, trang_thai_duyet) VALUES (?, ?, ?, ?, ?)',
      [data.khach_hang_id, data.dat_phong_id, data.so_sao, data.noi_dung || null, trangThaiDuyet]
    );
    return { id: result.insertId, ...data, trang_thai_duyet: trangThaiDuyet };
  },

  async updateStatus(id, trangThaiDuyet) {
    const [result] = await pool.execute(
      'UPDATE DANH_GIA SET trang_thai_duyet = ? WHERE id = ?',
      [trangThaiDuyet, id]
    );
    return result.affectedRows > 0;
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM DANH_GIA WHERE id = ?', [id]);
    return rows[0] || null;
  },
};
