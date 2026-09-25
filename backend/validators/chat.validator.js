import { z } from 'zod';

export const sendMessageSchema = z.object({
  noi_dung: z.string().min(1, 'Nội dung tin nhắn không được để trống').max(2000, 'Tin nhắn quá dài'),
});

export const staffReplySchema = z.object({
  noi_dung: z.string().min(1, 'Nội dung trả lời không được để trống').max(2000, 'Tin nhắn quá dài'),
});

export const guestLookupSchema = z.object({
  booking_code: z.string().min(1, 'Mã đặt phòng không được để trống'),
  sdt_or_email: z.string().min(1, 'SĐT hoặc email không được để trống'),
});
