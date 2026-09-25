import { khachHangRepository } from '../repositories/khachHang.repository.js';
import { xacThucKhachRepository } from '../repositories/xacThucKhach.repository.js';
import { datPhongRepository } from '../repositories/datPhong.repository.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { signToken } from '../config/jwt.js';
import { auditLogService } from './auditLogService.js';
import { createError } from '../utils/errors.js';
import { bookingService } from './bookingService.js';
import { notificationService } from './notificationService.js';
import { randomBytes } from 'node:crypto';

const MAX_LOGIN_ATTEMPTS = 5;

function stripSensitive(customer) {
  if (!customer) return customer;
  const { mat_khau_hash, so_lan_sai, ...safe } = customer;
  return safe;
}

function publicCustomer(customer) {
  return { id: customer.id, ho_ten: customer.ho_ten, email: customer.email };
}

export const customerService = {
  async list({ page, limit, offset, q }) {
    return khachHangRepository.findAll({ page, limit, offset, q });
  },
  async getById(id) {
    const c = await khachHangRepository.findById(id);
    if (!c) throw createError('NOT_FOUND');
    return stripSensitive(c);
  },
  async search(q) { return khachHangRepository.search(q); },
  async create(data, user) {
    if (await khachHangRepository.cccdExists(data.cccd_passport)) {
      throw createError('DUPLICATE_CUSTOMER_ID');
    }
    const customer = await khachHangRepository.insert(data);
    await auditLogService.log(user, 'create_customer', `Tạo khách hàng: ${data.ho_ten}`);
    return stripSensitive(customer);
  },
  async update(id, data, user) {
    if (data.cccd_passport && await khachHangRepository.cccdExists(data.cccd_passport, id)) {
      throw createError('DUPLICATE_CUSTOMER_ID');
    }
    const success = await khachHangRepository.update(id, data);
    if (!success) throw createError('NOT_FOUND');
    await auditLogService.log(user, 'update_customer', `Cập nhật khách hàng ID ${id}`);
    return { success: true };
  },
  async remove(id, user) {
    if (await khachHangRepository.hasActiveBooking(id)) {
      throw createError('HAS_ACTIVE_BOOKING');
    }
    const success = await khachHangRepository.remove(id);
    if (!success) throw createError('NOT_FOUND');
    await auditLogService.log(user, 'delete_customer', `Xóa khách hàng ID ${id}`);
    return { success: true };
  },

  // US-35: đăng ký web → email ảo / xác minh tự động (demo mode).
  async register(data) {
    if (await khachHangRepository.findByEmail(data.email)) {
      throw createError('DUPLICATE_EMAIL');
    }
    if (await khachHangRepository.cccdExists(data.cccd_passport)) {
      throw createError('DUPLICATE_CUSTOMER_ID');
    }
    const mat_khau_hash = await hashPassword(data.password);
    const customer = await khachHangRepository.insert({ ...data, mat_khau_hash, email_verified: true });
    await auditLogService.log(null, 'customer_register', `Khách hàng ${customer.email} đăng ký tài khoản`);
    return {
      customer: publicCustomer(customer),
      verification_required: false,
      email_verified: true,
    };
  },

  async verifyEmail(token) {
    const customerId = await xacThucKhachRepository.consume(token);
    if (!customerId) throw createError('AUTH_TOKEN_INVALID', { message: 'Liên kết xác thực không hợp lệ hoặc đã hết hạn' });
    await khachHangRepository.update(customerId, { email_verified: true });
    await auditLogService.log(null, 'customer_verified', `Tài khoản khách hàng ID ${customerId} đã xác thực email`);
    return { success: true };
  },

  async resendVerification(email) {
    const customer = await khachHangRepository.findByEmail(email);
    // Không tiết lộ email có tồn tại hay không.
    if (!customer || customer.email_verified) return { success: true };
    // Demo mode: tự động xác minh email mà không gửi email thật.
    await khachHangRepository.update(customer.id, { email_verified: true });
    return { success: true };
  },

  async login(identity, password) {
    const customer = await khachHangRepository.findByEmailOrPhone(identity);
    if (!customer || !customer.mat_khau_hash) throw createError('AUTH_INVALID_CREDENTIALS');
    if (customer.trang_thai === 'Locked') throw createError('AUTH_ACCOUNT_LOCKED');
    const isMatch = await comparePassword(password, customer.mat_khau_hash);
    if (!isMatch) {
      const attempts = customer.so_lan_sai + 1;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        await khachHangRepository.setLockout(customer.id, attempts, 'Locked');
        throw createError('AUTH_ACCOUNT_LOCKED');
      }
      await khachHangRepository.setLockout(customer.id, attempts, customer.trang_thai);
      throw createError('AUTH_INVALID_CREDENTIALS');
    }
    await khachHangRepository.setLockout(customer.id, 0, 'Active');
    const token = signToken({ id: customer.id, role: 'Customer' }, 'customer');
    return { token, customer: publicCustomer(customer) };
  },
  async getMe(userId) {
    const c = await khachHangRepository.findById(userId);
    if (!c) throw createError('NOT_FOUND');
    return stripSensitive(c);
  },
  async updateMe(userId, data) {
    const success = await khachHangRepository.update(userId, data);
    if (!success) throw createError('NOT_FOUND');
    return { success: true };
  },
  async changeMyPassword(userId, currentPassword, newPassword) {
    const customer = await khachHangRepository.findById(userId);
    if (!customer || !customer.mat_khau_hash) throw createError('NOT_FOUND');
    const isMatch = await comparePassword(currentPassword, customer.mat_khau_hash);
    if (!isMatch) throw createError('AUTH_INVALID_CREDENTIALS', { message: 'Mật khẩu hiện tại không đúng' });
    const newHash = await hashPassword(newPassword);
    await khachHangRepository.update(userId, { mat_khau_hash: newHash });
    return { success: true };
  },
  async getMyBookings(userId) {
    return datPhongRepository.findByCustomerIdWithDetails(userId);
  },
  async updateMyBooking(userId, bookingId, data) {
    const booking = await datPhongRepository.findById(bookingId);
    if (!booking) throw createError('NOT_FOUND');
    if (Number(booking.khach_hang_id) !== Number(userId)) throw createError('PERMISSION_DENIED');
    if (!['ChoXacNhan', 'DaDat'].includes(booking.trang_thai)) {
      throw createError('INVALID_STATUS_TRANSITION', { message: 'Đặt phòng không còn được phép chỉnh sửa' });
    }
    if (new Date(booking.ngay_check_in).getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      throw createError('INVALID_STATUS_TRANSITION', { message: 'Chỉ được sửa trước giờ nhận phòng ít nhất 24 giờ' });
    }
    return bookingService.update(bookingId, data, { id: userId, vai_tro: 'Customer' });
  },
  async cancelMyBooking(userId, bookingId) {
    const booking = await datPhongRepository.findById(bookingId);
    if (!booking) throw createError('NOT_FOUND');
    if (Number(booking.khach_hang_id) !== Number(userId)) throw createError('PERMISSION_DENIED');
    if (!['ChoXacNhan', 'DaDat'].includes(booking.trang_thai)) {
      throw createError('INVALID_STATUS_TRANSITION', { message: 'Đặt phòng không còn được phép hủy' });
    }
    if (new Date(booking.ngay_check_in).getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      throw createError('INVALID_STATUS_TRANSITION', { message: 'Chỉ được hủy trước giờ nhận phòng ít nhất 24 giờ' });
    }
    return bookingService.cancel(bookingId, { id: userId, vai_tro: 'Customer' });
  },
};
