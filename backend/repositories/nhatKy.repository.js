import { pool } from '../config/db.js';

export const nhatKyRepository = {
  async add({ nguoi_dung, hanh_dong, chi_tiet }) {
    const [result] = await pool.execute(
      'INSERT INTO NHAT_KY (nguoi_dung, hanh_dong, chi_tiet) VALUES (?, ?, ?)',
      [nguoi_dung, hanh_dong, chi_tiet || null]
    );
    return { id: result.insertId };
  },

  async findAll({ nguoi_dung, action, from, to, page, limit, offset }) {
    let sql = 'SELECT * FROM NHAT_KY';
    let countSql = 'SELECT COUNT(*) as total FROM NHAT_KY';
    const conditions = [];
    const params = [];
    const countParams = [];

    if (nguoi_dung) {
      conditions.push('nguoi_dung LIKE ?');
      params.push(`%${nguoi_dung}%`);
      countParams.push(`%${nguoi_dung}%`);
    }
    if (from) {
      conditions.push('thoi_gian >= ?');
      params.push(from);
      countParams.push(from);
    }
    if (to) {
      conditions.push('thoi_gian < DATE_ADD(DATE(?), INTERVAL 1 DAY)');
      params.push(to);
      countParams.push(to);
    }
    if (action) {
      conditions.push('hanh_dong LIKE ?');
      params.push(`%${action}%`);
      countParams.push(`%${action}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
      countSql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY thoi_gian DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(sql, params);
    const [countResult] = await pool.execute(countSql, countParams);
    return { rows, total: countResult[0].total };
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM NHAT_KY WHERE id = ?', [id]);
    return rows[0] || null;
  },
};
