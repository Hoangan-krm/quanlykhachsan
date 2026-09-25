import { hotelConfigRepository } from '../repositories/hotelConfig.repository.js';
import { auditLogService } from './auditLogService.js';
import { createError } from '../utils/errors.js';

export const configService = {
  async getPublic() {
    const config = await hotelConfigRepository.get();
    if (!config) throw createError('NOT_FOUND');
    return {
      ten_khach_san: config.ten_khach_san, dia_chi: config.dia_chi, logo: config.logo,
      check_in_time: config.check_in_time, check_out_time: config.check_out_time,
      // Publishable key an toàn để nhúng Stripe.js phía khách hàng (PK là dữ liệu công khai).
      stripe_publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || null,
    };
  },
  async getAdmin() {
    const config = await hotelConfigRepository.get();
    if (!config) throw createError('NOT_FOUND');
    return config;
  },
  async update(data, user) {
    await hotelConfigRepository.update(data);
    await auditLogService.log(user, 'update_config', 'Cập nhật cấu hình khách sạn');
    return { success: true };
  },
};
