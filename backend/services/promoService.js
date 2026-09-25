import { maGiamGiaRepository } from '../repositories/maGiamGia.repository.js';
import { pool } from '../config/db.js';
import { createError } from '../utils/errors.js';

export const promoService = {
  async list() { return maGiamGiaRepository.findAll(); },
  async findByCode(code) { return maGiamGiaRepository.findByCode(code); },
  async create(data) { return maGiamGiaRepository.insert(data); },
  async update(id, data) { const ok = await maGiamGiaRepository.update(id, data); if (!ok) throw createError('NOT_FOUND'); return { success: true }; },
  async remove(id) {
    const [used] = await pool.execute('SELECT COUNT(*) AS total FROM DAT_PHONG WHERE ma_giam_gia_id = ?', [id]);
    if (Number(used[0].total) > 0) {
      // Không xóa mã đang được tham chiếu — cho vô hiệu hóa thay vì xóa.
      throw createError('USED_IN_BOOKINGS', { message: 'Không thể xóa: mã đã được áp dụng cho đặt phòng. Hãy chuyển trạng thái Inactive.' });
    }
    return maGiamGiaRepository.remove(id);
  },
};
