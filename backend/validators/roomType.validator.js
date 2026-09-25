import { z } from 'zod';

export const createRoomTypeSchema = z.object({
  ten_loai_phong: z.string().min(1, 'Tên loại phòng không được để trống'),
  mo_ta: z.string().optional(),
  gia_mac_dinh: z.number().positive('Giá phải lớn hơn 0'),
  suc_chua: z.number().int().positive('Sức chứa phải lớn hơn 0').optional().default(2),
  hinh_anh: z.string().optional(),
});

export const updateRoomTypeSchema = z.object({
  ten_loai_phong: z.string().min(1).optional(),
  mo_ta: z.string().optional(),
  gia_mac_dinh: z.number().positive().optional(),
  suc_chua: z.number().int().positive().optional(),
  hinh_anh: z.string().optional(),
});
