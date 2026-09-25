import { z } from 'zod';

export const createStaffSchema = z.object({
  ho_ten: z.string().min(1, 'Họ tên không được để trống'),
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự').regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa').regex(/[0-9]/, 'Phải có ít nhất 1 chữ số'),
  vai_tro: z.enum(['Admin', 'QuanLy', 'LeTan']),
});

export const updateStaffSchema = z.object({
  ho_ten: z.string().min(1).optional(),
  email: z.string().email().optional(),
  vai_tro: z.enum(['Admin', 'QuanLy', 'LeTan']).optional(),
  trang_thai: z.enum(['Active', 'Locked']).optional(),
});
