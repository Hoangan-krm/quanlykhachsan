import { z } from 'zod';
export const generateInvoiceSchema = z.object({ dat_phong_id: z.number().int().positive() });
