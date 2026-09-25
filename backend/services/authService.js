import { nguoiDungRepository } from '../repositories/nguoiDung.repository.js';
import { auditLogService } from './auditLogService.js';
import { signToken } from '../config/jwt.js';
import { randomBytes } from 'node:crypto';
import { authStateRepository, credentialVersion } from '../repositories/authState.repository.js';
import { notificationService } from './notificationService.js';
import { hashPassword, comparePassword } from '../utils/bcrypt.js';
import { createError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const MAX_LOGIN_ATTEMPTS = 5;

function stripSensitive(user) {
  const { mat_khau_hash, so_lan_sai, ...safe } = user;
  return safe;
}

export const authService = {
  async login(email, password) {
    const user = await nguoiDungRepository.findByEmail(email);
    if (!user) {
      throw createError('AUTH_INVALID_CREDENTIALS');
    }

    if (user.trang_thai === 'Locked') {
      throw createError('AUTH_ACCOUNT_LOCKED');
    }

    const isMatch = await comparePassword(password, user.mat_khau_hash);
    if (!isMatch) {
      const newAttempts = user.so_lan_sai + 1;
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        await nguoiDungRepository.updateLockout(user.id, newAttempts, 'Locked');
        logger.warn(`Account locked: ${email} after ${newAttempts} failed attempts`);
        throw createError('AUTH_ACCOUNT_LOCKED');
      }
      await nguoiDungRepository.updateLockout(user.id, newAttempts, user.trang_thai);
      throw createError('AUTH_INVALID_CREDENTIALS');
    }

    await nguoiDungRepository.updateLockout(user.id, 0, 'Active');
    const token = signToken({ id: user.id, role: user.vai_tro, credentialVersion: credentialVersion(user.mat_khau_hash) }, 'staff');
    await auditLogService.log(user, 'login_success', `Đăng nhập thành công`);

    return { token, user: stripSensitive(user) };
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await nguoiDungRepository.findById(userId);
    if (!user) {
      throw createError('NOT_FOUND');
    }

    const fullUser = await nguoiDungRepository.findByEmail(user.email);
    const isMatch = await comparePassword(currentPassword, fullUser.mat_khau_hash);
    if (!isMatch) {
      throw createError('AUTH_INVALID_CREDENTIALS', { message: 'Mật khẩu hiện tại không đúng' });
    }

    const newHash = await hashPassword(newPassword);
    await nguoiDungRepository.update(userId, { mat_khau_hash: newHash });
    await auditLogService.log(user, 'change_password', 'Đổi mật khẩu thành công');

    return { success: true };
  },

  async forgotPassword(email) {
    const user = await nguoiDungRepository.findByEmail(email);
    if (!user) {
      return { success: true };
    }
    const resetToken = randomBytes(32).toString('hex');
    await authStateRepository.createReset(user.id, resetToken);
    // Portal nhân viên phục vụ tại /portal — trang đăng nhập xử lý ?reset=.
    const resetUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/portal/#/login?reset=${resetToken}`;
    await notificationService.sendPasswordReset(email, resetUrl);
    return { success: true };
  },

  async resetPassword(token, newPassword) {
    const newHash = await hashPassword(newPassword);
    const userId = await authStateRepository.consumeReset(token, newHash);
    if (!userId) throw createError('AUTH_TOKEN_INVALID');
    const user = await nguoiDungRepository.findById(userId);
    await auditLogService.log(user, 'reset_password', 'Đặt lại mật khẩu thành công');
    return { success: true };
  },

  async getProfile(userId) {
    const user = await nguoiDungRepository.findById(userId);
    if (!user) {
      throw createError('NOT_FOUND');
    }
    return stripSensitive(user);
  },
};
