import { z } from 'zod';
export const openShiftSchema = z.object({ tien_mat_dau_ca: z.number().min(0) });
export const closeShiftSchema = z.object({ tien_mat_cuoi_ca: z.number().min(0) });
export const reviewSchema = z.object({ dat_phong_id: z.number().int().positive(), so_sao: z.number().int().min(1).max(5), noi_dung: z.string().optional() });
export const moderateReviewSchema = z.object({ trang_thai_duyet: z.enum(['DaDuyet','TuChoi']) });
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải có định dạng YYYY-MM-DD');
export const promoSchema = z.object({
  ma: z.string().min(1),
  phan_tram: z.number().min(0).max(100),
  ngay_bat_dau: dateStr.optional().nullable(),
  ngay_ket_thuc: dateStr.optional().nullable(),
  gioi_han_su_dung: z.number().int().positive().optional().nullable(),
  gia_tri_toi_thieu: z.number().min(0).optional().nullable(),
  trang_thai: z.enum(['Active','Inactive']).optional(),
}).refine(d => !d.ngay_bat_dau || !d.ngay_ket_thuc || d.ngay_ket_thuc > d.ngay_bat_dau, {
  message: 'Ngày kết thúc phải sau ngày bắt đầu',
});
export const updatePromoSchema = z.object({
  ma: z.string().min(1).optional(),
  phan_tram: z.number().min(0).max(100).optional(),
  ngay_bat_dau: dateStr.optional().nullable(),
  ngay_ket_thuc: dateStr.optional().nullable(),
  gioi_han_su_dung: z.number().int().positive().optional().nullable(),
  gia_tri_toi_thieu: z.number().min(0).optional().nullable(),
  trang_thai: z.enum(['Active','Inactive']).optional(),
});
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ phải có định dạng HH:mm');
export const configSchema = z.object({
  ten_khach_san: z.string().trim().min(1).max(200), dia_chi: z.string().trim().min(1).max(300),
  vat: z.number().min(0).max(1), check_in_time: time.optional(), check_out_time: time.optional(),
  logo: z.union([z.literal(''), z.string().url().max(500)]).optional(),
  ma_hoa_don_mau: z.string().trim().min(1).max(50).optional(),
  no_show_deposit_policy: z.enum(['Giu', 'Hoan']).optional(),
  phi_tra_muon: z.number().min(0).max(9999999999.99).optional(),
  nguong_duyet_hoan_tien: z.number().min(0).max(9999999999.99).optional(),
});
export const verifyAccountSchema = z.object({ token: z.string().min(10) });
export const resendVerificationSchema = z.object({ email: z.string().email() });
