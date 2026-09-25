import { logger } from '../utils/logger.js';

// SMTP is optional: when SMTP_HOST is not configured the service degrades to
// logging the message (dev/demo), so business flows never break on mail errors.

let transporter = null;
async function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    const mod = await import('nodemailer');
    const nodemailer = mod.default ?? mod;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

async function sendMail(to, subject, text) {
  const transport = getTransporter();
  if (!transport) {
    logger.info(`[MAIL:DEV] to=${to} subject="${subject}"\n${text}`);
    return { delivered: false, mode: 'logged' };
  }
  try {
    await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER || 'hotel@example.com', to, subject, text });
    return { delivered: true };
  } catch (error) {
    logger.error(`[MAIL] Send failed to ${to}: ${error.message}`);
    return { delivered: false, mode: 'error' };
  }
}

const baseUrl = () => process.env.APP_BASE_URL || 'http://localhost:3000';

export const notificationService = {
  // US-41: email xác nhận đặt phòng gồm mã đặt phòng, ngày ở, tổng tiền.
  async sendBookingConfirmation(booking) {
    if (!booking.email) return { delivered: false, reason: 'no_email' };
    const subject = `Xác nhận đặt phòng #${booking.id} - Khách sạn Hoàng An`;
    const text = [
      `Xin chào ${booking.ten_khach || 'quý khách'},`,
      '',
      `Đặt phòng của bạn đã được ghi nhận thành công.`,
      `Mã đặt phòng: ${booking.id}`,
      `Ngày nhận phòng: ${booking.ngay_check_in}`,
      `Ngày trả phòng: ${booking.ngay_check_out}`,
      `Số tiền tạm tính: ${Number(booking.tong_tien || 0).toLocaleString('vi-VN')} ₫`,
      '',
      'Tra cứu đơn: ' + `${baseUrl()}/#/guest-lookup`,
      '',
      'Trân trọng,',
      'Khách sạn Hoàng An',
    ].join('\n');
    return sendMail(booking.email, subject, text);
  },

  async sendPasswordReset(email, resetUrl) {
    const subject = 'Khôi phục mật khẩu - Khách sạn Hoàng An';
    const text = [
      'Bạn (hoặc ai đó) vừa yêu cầu khôi phục mật khẩu.',
      `Liên kết (hết hạn sau 15 phút, dùng một lần): ${resetUrl}`,
      'Nếu không phải bạn, hãy bỏ qua email này.',
    ].join('\n');
    return sendMail(email, subject, text);
  },

  // US-35: kích hoạt tài khoản khách hàng qua link xác thực email.
  async sendAccountVerification(email, verifyUrl) {
    const subject = 'Xác thực tài khoản - Khách sạn Hoàng An';
    const text = [
      `Cảm ơn bạn đã đăng ký tài khoản.`,
      `Nhấn vào liên kết sau để kích hoạt tài khoản (hết hạn sau 24 giờ): ${verifyUrl}`,
      'Nếu không phải bạn, hãy bỏ qua email này.',
    ].join('\n');
    return sendMail(email, subject, text);
  },

  async sendOtp(email, otp) {
    const subject = 'Mã OTP - Khách sạn Hoàng An';
    return sendMail(email, subject, `Mã OTP của bạn là: ${otp} (hiệu lực 10 phút). Không chia sẻ mã này cho bất kỳ ai.`);
  },
};
