import { authService } from '../services/authService.js';
import { audit } from '../utils/audit.js';
import { authStateRepository } from '../repositories/authState.repository.js';

export const authController = {
  async login(req, res, next) {
    try {
      const { email, password } = req.validatedData;
      const result = await authService.login(email, password);
      res.status(200).json({
        success: true,
        data: result,
        message: 'Đăng nhập thành công',
      });
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res, next) {
    try {
      await authStateRepository.revoke(req.auth.token, req.auth.expiresAt);
      await audit(req, 'logout', 'Đăng xuất');
      res.status(200).json({
        success: true,
        data: null,
        message: 'Đăng xuất thành công',
      });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.validatedData;
      await authService.changePassword(req.user.id, currentPassword, newPassword);
      res.status(200).json({
        success: true,
        data: null,
        message: 'Đổi mật khẩu thành công',
      });
    } catch (error) {
      next(error);
    }
  },

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.validatedData;
      await authService.forgotPassword(email);
      res.status(200).json({
        success: true,
        data: null,
        message: 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi',
      });
    } catch (error) {
      next(error);
    }
  },

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.validatedData;
      await authService.resetPassword(token, newPassword);
      res.status(200).json({
        success: true,
        data: null,
        message: 'Đặt lại mật khẩu thành công',
      });
    } catch (error) {
      next(error);
    }
  },

  async me(req, res, next) {
    try {
      const user = await authService.getProfile(req.user.id);
      res.status(200).json({
        success: true,
        data: user,
        message: 'OK',
      });
    } catch (error) {
      next(error);
    }
  },
};
