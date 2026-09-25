import { danhGiaRepository } from '../repositories/danhGia.repository.js';
import { datPhongRepository } from '../repositories/datPhong.repository.js';
import { auditLogService } from './auditLogService.js';
import { createError } from '../utils/errors.js';

export const reviewService = {
  async list({ page, limit, offset, trang_thai_duyet }) { return danhGiaRepository.findAll({ page, limit, offset, trang_thai_duyet }); },
  async listPublic() { return danhGiaRepository.findPublic(); },
  async submit(customerId, datPhongId, soSao, noiDung, user) {
    const booking = await datPhongRepository.findById(datPhongId);
    if (!booking) throw createError('NOT_FOUND');
    if (Number(booking.khach_hang_id) !== Number(customerId)) {
      throw createError('PERMISSION_DENIED');
    }
    if (booking.trang_thai !== 'DaTra') throw createError('REVIEW_NOT_ELIGIBLE');
    const review = await danhGiaRepository.insert({ khach_hang_id: customerId, dat_phong_id: datPhongId, so_sao: soSao, noi_dung: noiDung });
    await auditLogService.log(user, 'submit_review', `Đánh giá ${soSao} sao cho booking #${datPhongId}`);
    return review;
  },
  async moderate(reviewId, newStatus, user) {
    const review = await danhGiaRepository.findById(reviewId);
    if (!review) throw createError('NOT_FOUND');
    await danhGiaRepository.updateStatus(reviewId, newStatus);
    await auditLogService.log(user, 'moderate_review', `Duyệt đánh giá #${reviewId}: ${newStatus}`);
    return { success: true };
  },
};
