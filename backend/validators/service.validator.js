import { z } from 'zod';
export const createServiceSchema = z.object({ ten_dich_vu: z.string().min(1), don_gia: z.number().positive(), don_vi_tinh: z.string().min(1), trang_thai: z.enum(['Active','Inactive']).optional() });
export const updateServiceSchema = z.object({ ten_dich_vu: z.string().min(1).optional(), don_gia: z.number().positive().optional(), don_vi_tinh: z.string().min(1).optional(), trang_thai: z.enum(['Active','Inactive']).optional() });
export const updateServiceStatusSchema = z.object({ trang_thai: z.enum(['Active','Inactive']) });
