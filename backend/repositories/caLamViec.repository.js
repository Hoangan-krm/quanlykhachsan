import { pool } from '../config/db.js';

export const caLamViecRepository = {
  async findAll({ page, limit, offset, nguoi_dung_id } = {}) {
    let sql = `SELECT clv.*, nd.ho_ten as ten_nhan_vien, nd.vai_tro
               FROM CA_LAM_VIEC clv
               JOIN NGUOI_DUNG nd ON clv.nguoi_dung_id = nd.id`;
    let countSql = 'SELECT COUNT(*) as total FROM CA_LAM_VIEC';
    const conditions = [];
    const params = [];
    const countParams = [];

    if (nguoi_dung_id) {
      conditions.push('clv.nguoi_dung_id = ?');
      params.push(nguoi_dung_id);
      countParams.push(nguoi_dung_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
      countSql += ' WHERE ' + conditions.join(' AND ').replace(/clv\./g, '');
    }

    sql += ' ORDER BY clv.gio_mo_ca DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(sql, params);
    const [countResult] = await pool.execute(countSql, countParams);
    return { rows, total: countResult[0].total };
  },

  async findCurrentOpen(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM CA_LAM_VIEC WHERE nguoi_dung_id = ? AND gio_dong_ca IS NULL ORDER BY gio_mo_ca DESC LIMIT 1',
      [userId]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT clv.*, nd.ho_ten as ten_nhan_vien
       FROM CA_LAM_VIEC clv
       JOIN NGUOI_DUNG nd ON clv.nguoi_dung_id = nd.id
       WHERE clv.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async insert(data) {
    const [result] = await pool.execute(
      'INSERT INTO CA_LAM_VIEC (nguoi_dung_id, gio_mo_ca, tien_mat_dau_ca) VALUES (?, NOW(), ?)',
      [data.nguoi_dung_id, data.tien_mat_dau_ca]
    );
    return { id: result.insertId, ...data };
  },

  async close(id, tienMatCuoiCa, chenhLech) {
    const [result] = await pool.execute(
      'UPDATE CA_LAM_VIEC SET gio_dong_ca = NOW(), tien_mat_cuoi_ca = ?, chenh_lech = ? WHERE id = ?',
      [tienMatCuoiCa, chenhLech, id]
    );
    return result.affectedRows > 0;
  },
};
