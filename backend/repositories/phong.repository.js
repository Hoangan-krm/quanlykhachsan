import { pool } from '../config/db.js';

export const phongRepository = {
  async findAll({ trang_thai, loai_phong_id, page, limit, offset } = {}) {
    let sql = `SELECT p.*, lp.ten_loai_phong, lp.gia_mac_dinh
               FROM PHONG p
               JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id`;
    let countSql = 'SELECT COUNT(*) as total FROM PHONG p';
    const conditions = [];
    const params = [];
    const countParams = [];

    if (trang_thai) {
      conditions.push('p.trang_thai = ?');
      params.push(trang_thai);
      countParams.push(trang_thai);
    }
    if (loai_phong_id) {
      conditions.push('p.loai_phong_id = ?');
      params.push(loai_phong_id);
      countParams.push(loai_phong_id);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
      countSql += ' WHERE ' + conditions.join(' AND ').replace(/p\./g, '');
    }

    sql += ' ORDER BY p.so_phong ASC';
    if (limit !== undefined) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [rows] = await pool.execute(sql, params);
    const [countResult] = await pool.execute(countSql, countParams);
    return { rows, total: countResult[0].total };
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT p.*, lp.ten_loai_phong, lp.gia_mac_dinh
       FROM PHONG p
       JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findBySoPhong(soPhong) {
    const [rows] = await pool.execute('SELECT * FROM PHONG WHERE so_phong = ?', [soPhong]);
    return rows[0] || null;
  },

  async findVacant(checkIn, checkOut, roomTypeId, guests) {
    let sql = `SELECT p.*, lp.ten_loai_phong, lp.gia_mac_dinh, lp.mo_ta, lp.hinh_anh, lp.suc_chua
               FROM PHONG p
               JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
               WHERE p.trang_thai != 'BaoTri'
                 AND p.trang_thai != 'DangO'
                 AND NOT EXISTS (
                   SELECT 1 FROM DAT_PHONG dp
                   WHERE dp.phong_id = p.id
                     AND dp.trang_thai IN ('ChoXacNhan','DaDat','DangO')
                     AND dp.ngay_check_in < ?
                     AND dp.ngay_check_out > ?
                 )`;
    const params = [checkOut, checkIn];
    if (roomTypeId) {
      sql += ' AND p.loai_phong_id = ?';
      params.push(roomTypeId);
    }
    if (guests && guests > 0) {
      sql += ' AND lp.suc_chua >= ?';
      params.push(guests);
    }
    sql += ' ORDER BY p.so_phong ASC';
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  async insert(data) {
    const [result] = await pool.execute(
      'INSERT INTO PHONG (so_phong, loai_phong_id, trang_thai) VALUES (?, ?, ?)',
      [data.so_phong, data.loai_phong_id, data.trang_thai || 'Trong']
    );
    return { id: result.insertId, ...data };
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(data)) {
      if (['so_phong', 'loai_phong_id', 'trang_thai'].includes(key) && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return false;
    values.push(id);
    const [result] = await pool.execute(`UPDATE PHONG SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows > 0;
  },

  async updateStatus(id, trangThai) {
    const [result] = await pool.execute('UPDATE PHONG SET trang_thai = ? WHERE id = ?', [trangThai, id]);
    return result.affectedRows > 0;
  },

  async remove(id) {
    const [result] = await pool.execute('DELETE FROM PHONG WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async hasActiveBooking(id) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM DAT_PHONG
       WHERE phong_id = ? AND trang_thai IN ('ChoXacNhan','DaDat','DangO')`,
      [id]
    );
    return rows[0].count > 0;
  },

  async countByStatus() {
    const [rows] = await pool.execute(
      'SELECT trang_thai, COUNT(*) as count FROM PHONG GROUP BY trang_thai'
    );
    return rows;
  },
};
