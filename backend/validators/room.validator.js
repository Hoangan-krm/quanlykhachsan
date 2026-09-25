import { z } from 'zod';

export const createRoomSchema = z.object({
  so_phong: z.string().min(1, 'Số phòng không được để trống'),
  loai_phong_id: z.number().int().positive('Loại phòng không hợp lệ'),
  trang_thai: z.enum(['Trong', 'DaDat', 'DangO', 'DangDon', 'BaoTri']).optional(),
});

export const updateRoomSchema = z.object({
  so_phong: z.string().min(1).optional(),
  loai_phong_id: z.number().int().positive().optional(),
});

export const updateStatusSchema = z.object({
  trang_thai: z.enum(['Trong', 'DaDat', 'DangO', 'DangDon', 'BaoTri']),
});
