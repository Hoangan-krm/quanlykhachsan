import { z } from 'zod';

export const createCustomerSchema = z.object({
  ho_ten: z.string().min(1, 'Họ tên không được để trống'),
  sdt: z.string().min(1, 'Số điện thoại không được để trống'),
  email: z.string().email().optional().nullable(),
  cccd_passport: z.string().min(1, 'CCCD/Passport không được để trống'),
  quoc_tich: z.string().optional(),
  dia_chi: z.string().optional(),
  ghi_chu: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  ho_ten: z.string().min(1).optional(),
  sdt: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  cccd_passport: z.string().min(1).optional(),
  quoc_tich: z.string().optional(),
  dia_chi: z.string().optional(),
  ghi_chu: z.string().optional(),
});

export const registerSchema = z.object({
  ho_ten: z.string().min(1),
  sdt: z.string().min(1),
  email: z.string().email(),
  cccd_passport: z.string().min(1),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  quoc_tich: z.string().optional(),
  dia_chi: z.string().optional(),
});

// US-36/US-35: đăng nhập bằng email HOẶC số điện thoại (website cho nhập cả hai).
export const customerLoginSchema = z.object({
  login: z.string().min(3, 'Vui lòng nhập email hoặc số điện thoại').optional(),
  email: z.string().email().optional(),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
}).refine(d => Boolean(d.login || d.email), { message: 'Vui lòng nhập email hoặc số điện thoại' });
