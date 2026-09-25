import { z } from 'zod';
export const recordPaymentSchema = z.object({ so_tien: z.number().positive('Số tiền phải lớn hơn 0'), hinh_thuc: z.enum(['TienMat','ChuyenKhoan','The']), ghi_chu: z.string().optional() });
export const refundSchema = z.object({ reason: z.string().min(1, 'Lý do hoàn lại không được để trống'), so_tien: z.number().positive('Số tiền hoàn phải lớn hơn 0').optional() });
export const onlinePaymentSchema = z.object({ booking_id: z.number().int().positive(), amount: z.number().positive(), gateway_token: z.string().min(1).optional() });
