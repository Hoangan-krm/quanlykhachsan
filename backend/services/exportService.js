import { datPhongRepository } from '../repositories/datPhong.repository.js';
import { pool } from '../config/db.js';

export const exportService = {
  async tempResidence(from, to, format = 'excel') {
    const [rows] = await pool.execute(
      `SELECT dp.id as booking_id, kh.ho_ten, kh.cccd_passport, kh.quoc_tich, kh.sdt,
              dp.ngay_check_in, dp.ngay_check_out, dp.thoi_gian_check_in_thuc,
              p.so_phong, lp.ten_loai_phong
       FROM DAT_PHONG dp
       JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id
       JOIN PHONG p ON dp.phong_id = p.id
       JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
       WHERE dp.thoi_gian_check_in_thuc IS NOT NULL
         AND dp.thoi_gian_check_in_thuc >= ? AND dp.thoi_gian_check_in_thuc <= ?
       ORDER BY dp.thoi_gian_check_in_thuc ASC`,
      [from, to]
    );

    if (format === 'excel') {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Tạm trú');
      sheet.columns = [
        { header: 'Họ tên', key: 'ho_ten', width: 25 },
        { header: 'CCCD/Passport', key: 'cccd_passport', width: 20 },
        { header: 'Quốc tịch', key: 'quoc_tich', width: 15 },
        { header: 'SĐT', key: 'sdt', width: 15 },
        { header: 'Phòng', key: 'so_phong', width: 10 },
        { header: 'Ngày check-in', key: 'ngay_check_in', width: 15 },
        { header: 'Ngày check-out', key: 'ngay_check_out', width: 15 },
        { header: 'Thời gian nhận thực', key: 'thoi_gian_check_in_thuc', width: 20 },
      ];
      sheet.addRows(rows);
      const buffer = await workbook.xlsx.writeBuffer();
      return { buffer, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }
    return { data: rows, contentType: 'application/json' };
  },
};
