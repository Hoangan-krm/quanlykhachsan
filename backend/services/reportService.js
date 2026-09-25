import { thanhToanRepository } from '../repositories/thanhToan.repository.js';
import { phongRepository } from '../repositories/phong.repository.js';
import { datPhongRepository } from '../repositories/datPhong.repository.js';
import { hoaDonRepository } from '../repositories/hoaDon.repository.js';
import { nhatKyRepository } from '../repositories/nhatKy.repository.js';
import { caLamViecRepository } from '../repositories/caLamViec.repository.js';
import { pool } from '../config/db.js';
import { parsePagination } from '../utils/pagination.js';
import { daysBetween } from '../utils/date.js';

export const reportService = {
  async revenue(from, to, groupBy = 'day') {
    return thanhToanRepository.findRevenueByPeriod(from, to, groupBy);
  },

  async occupancy(from, to) {
    const [roomCount] = await pool.execute('SELECT COUNT(*) as total FROM PHONG WHERE trang_thai != "BaoTri"');
    const totalRooms = roomCount[0].total;
    const days = daysBetween(from, to) || 1;
    const availableNights = totalRooms * days;

    const [bookedNights] = await pool.execute(
      `SELECT COALESCE(SUM(DATEDIFF(LEAST(dp.ngay_check_out, ?), GREATEST(dp.ngay_check_in, ?))), 0) as nights
       FROM DAT_PHONG dp
       WHERE dp.trang_thai IN ('DaDat','DangO','DaTra')
         AND dp.ngay_check_in < ? AND dp.ngay_check_out > ?`,
      [to, from, to, from]
    );
    const nightsBooked = Number(bookedNights[0].nights);
    const rate = availableNights > 0 ? (nightsBooked / availableNights) * 100 : 0;

    const [roomRanking] = await pool.execute(
      `SELECT p.so_phong, lp.ten_loai_phong, COUNT(dp.id) as booking_count
       FROM PHONG p
       JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
       LEFT JOIN DAT_PHONG dp ON dp.phong_id = p.id AND dp.trang_thai IN ('DaDat','DangO','DaTra')
         AND dp.ngay_check_in < ? AND dp.ngay_check_out > ?
       GROUP BY p.id, p.so_phong, lp.ten_loai_phong
       ORDER BY booking_count DESC`,
      [to, from]
    );

    return { rate: Math.round(rate * 100) / 100, nights_booked: nightsBooked, available_nights: availableNights, room_ranking: roomRanking };
  },

  async shiftReport(from, to, staffId) {
    let sql = `SELECT clv.*, nd.ho_ten as ten_nhan_vien
               FROM CA_LAM_VIEC clv
               JOIN NGUOI_DUNG nd ON clv.nguoi_dung_id = nd.id
               WHERE clv.gio_mo_ca >= ? AND clv.gio_mo_ca <= ?`;
    const params = [from, to];
    if (staffId) { sql += ' AND clv.nguoi_dung_id = ?'; params.push(staffId); }
    sql += ' ORDER BY clv.gio_mo_ca DESC';
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  async history({ staffId, from, to, action, page, limit, offset }) {
    let sql = 'SELECT * FROM NHAT_KY';
    let countSql = 'SELECT COUNT(*) as total FROM NHAT_KY';
    const conditions = [];
    const params = [];
    if (from) { conditions.push('thoi_gian >= ?'); params.push(from); }
    if (to) { conditions.push('thoi_gian <= ?'); params.push(to); }
    if (action) { conditions.push('hanh_dong = ?'); params.push(action); }
    if (staffId) { conditions.push('nguoi_dung LIKE ?'); params.push(`%${staffId}%`); }
    if (conditions.length > 0) { sql += ' WHERE ' + conditions.join(' AND '); countSql += ' WHERE ' + conditions.join(' AND '); }
    sql += ' ORDER BY thoi_gian DESC LIMIT ? OFFSET ?';
    const [rows] = await pool.execute(sql, [...params, limit, offset]);
    const [countResult] = await pool.execute(countSql, params);
    return { rows, total: countResult[0].total };
  },

  async dashboardStats() {
    const roomStatusCounts = await phongRepository.countByStatus();
    const todayArrivals = await datPhongRepository.findTodayArrivals();
    const todayDepartures = await datPhongRepository.findTodayDepartures();
    const todayRevenue = await thanhToanRepository.findTodayTotal();
    const bookingStatusCounts = await datPhongRepository.countByStatus();

    const rooms = {};
    for (const r of roomStatusCounts) rooms[r.trang_thai] = r.count;
    const bookings = {};
    for (const b of bookingStatusCounts) bookings[b.trang_thai] = b.count;

    return {
      rooms: { total: Object.values(rooms).reduce((a, b) => a + b, 0), ...rooms },
      bookings: { ...bookings },
      today_arrivals: todayArrivals,
      today_departures: todayDepartures,
      today_revenue: todayRevenue,
    };
  },
};
