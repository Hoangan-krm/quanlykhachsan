import { z } from 'zod';

export const createBookingSchema = z.object({
  khach_hang_id: z.number().int().positive(),
  phong_id: z.number().int().positive(),
  ngay_check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ (YYYY-MM-DD)'),
  ngay_check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ (YYYY-MM-DD)'),
  tien_coc: z.number().min(0).optional().default(0),
  so_khach: z.number().int().min(1).max(100).optional().default(1),
  ma_km: z.string().min(1).optional(),
}).refine(d => d.ngay_check_out > d.ngay_check_in, { message: 'Ngày check-out phải sau ngày check-in' });

export const updateBookingSchema = z.object({
  khach_hang_id: z.number().int().positive().optional(),
  phong_id: z.number().int().positive().optional(),
  ngay_check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ngay_check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tien_coc: z.number().min(0).optional(),
  so_khach: z.number().int().min(1).max(100).optional(),
}).refine(d => !d.ngay_check_in || !d.ngay_check_out || d.ngay_check_out > d.ngay_check_in, { message: 'Ngày check-out phải sau ngày check-in' });

export const customerUpdateBookingSchema = z.object({
  phong_id: z.number().int().positive().optional(),
  ngay_check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ngay_check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'Cần ít nhất một thay đổi' })
  .refine(data => !data.ngay_check_in || !data.ngay_check_out || data.ngay_check_out > data.ngay_check_in, {
    message: 'Ngày check-out phải sau ngày check-in',
  });

export const guestBookingSchema = z.object({
  ho_ten: z.string().min(1),
  sdt: z.string().min(1),
  cccd_passport: z.string().min(1).optional(),
  phong_id: z.number().int().positive(),
  ngay_check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ngay_check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tien_coc: z.number().min(0).optional().default(0),
  so_khach: z.number().int().min(1).max(100).optional().default(1),
  email: z.string().email().optional(),
  ma_km: z.string().min(1).optional(),
}).refine(d => d.ngay_check_out > d.ngay_check_in, { message: 'Ngày check-out phải sau ngày check-in' });

export const transferRoomSchema = z.object({
  new_phong_id: z.number().int().positive(),
});

export const extendStaySchema = z.object({
  ngay_check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  phu_phi_tra_muon: z.number().min(0).optional(),
});

export const refundDepositSchema = z.object({
  so_tien: z.number().positive('Số tiền hoàn phải lớn hơn 0').optional(),
  ly_do: z.string().min(1, 'Lý do hoàn cọc không được để trống'),
});

export const addServiceSchema = z.object({
  dich_vu_id: z.number().int().positive(),
  so_luong: z.number().int().positive(),
});

export const applyPromoSchema = z.object({
  ma: z.string().min(1),
});

// Kiểm tra nhanh mã KM trên website khách trước khi đặt (US-44).
export const validatePromoSchema = z.object({
  ma: z.string().min(1, 'Vui lòng nhập mã giảm giá'),
  so_tien: z.number().min(0).optional(),
});
