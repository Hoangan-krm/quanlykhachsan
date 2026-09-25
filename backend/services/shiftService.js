import { caLamViecRepository } from '../repositories/caLamViec.repository.js';
import { pool } from '../config/db.js';
import { auditLogService } from './auditLogService.js';
import { createError } from '../utils/errors.js';

export const shiftService = {
  async list({ page, limit, offset, nguoi_dung_id }) { return caLamViecRepository.findAll({ page, limit, offset, nguoi_dung_id }); },
  async findCurrentOpen(userId) { return caLamViecRepository.findCurrentOpen(userId); },
  async open(userId, tienMatDauCa, user) {
    const existing = await caLamViecRepository.findCurrentOpen(userId);
    if (existing) throw createError('SHIFT_ALREADY_OPEN');
    const shift = await caLamViecRepository.insert({ nguoi_dung_id: userId, tien_mat_dau_ca: tienMatDauCa });
    await auditLogService.log(user, 'open_shift', `Mở ca, tiền đầu ca: ${tienMatDauCa}`);
    return shift;
  },
  async close(shiftId, tienMatCuoiCa, user) {
    const shift = await caLamViecRepository.findById(shiftId);
    if (!shift) throw createError('NOT_FOUND');
    if (shift.gio_dong_ca) throw createError('SHIFT_ALREADY_CLOSED');
    // Chỉ đếm giao dịch tiền mặt gắn với ca này (fallback: giao dịch cũ chưa gắn ca).
    const [stamped] = await pool.execute(
      "SELECT COALESCE(SUM(so_tien),0) AS total FROM THANH_TOAN WHERE ca_lam_viec_id = ? AND hinh_thuc = 'TienMat'",
      [shiftId]
    );
    const [legacy] = await pool.execute(
      `SELECT COALESCE(SUM(so_tien),0) AS total FROM THANH_TOAN
       WHERE ca_lam_viec_id IS NULL AND nguoi_dung_id = ? AND hinh_thuc = 'TienMat'
         AND thoi_gian >= ? AND thoi_gian <= NOW()`,
      [shift.nguoi_dung_id, shift.gio_mo_ca]
    );
    const cashMovements = Number(stamped[0].total) + Number(legacy[0].total);
    const expectedCash = Number(shift.tien_mat_dau_ca) + cashMovements;
    const chenhLech = tienMatCuoiCa - expectedCash;
    await caLamViecRepository.close(shiftId, tienMatCuoiCa, chenhLech);
    await auditLogService.log(user, 'close_shift', `Đóng ca #${shiftId}, chênh lệch: ${chenhLech}`);
    return { success: true, chenh_lech: chenhLech, expected_cash: expectedCash, warning: chenhLech !== 0 ? `Chênh lệch ${chenhLech} ₫` : null };
  },
};
