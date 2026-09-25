import { customerService } from '../services/customerService.js';
import { exportService } from '../services/exportService.js';
import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';

export const customerController = {
  async list(req, res, next) {
    try { const p = parsePagination(req.query); const { rows, total } = await customerService.list({ ...p, q: req.query.q || req.query.search }); res.json(buildPaginationResponse(rows, total, p.page, p.limit)); }
    catch (e) { next(e); }
  },
  async search(req, res, next) {
    try { const rows = await customerService.search(req.query.q); res.json({ success: true, data: rows, message: 'OK' }); }
    catch (e) { next(e); }
  },
  async getById(req, res, next) {
    try { const c = await customerService.getById(req.params.id); res.json({ success: true, data: c, message: 'OK' }); }
    catch (e) { next(e); }
  },
  async create(req, res, next) {
    try { const c = await customerService.create(req.validatedData, req.user); res.status(201).json({ success: true, data: c, message: 'Tạo khách hàng thành công' }); }
    catch (e) { next(e); }
  },
  async update(req, res, next) {
    try { await customerService.update(req.params.id, req.validatedData, req.user); res.json({ success: true, data: null, message: 'Cập nhật thành công' }); }
    catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await customerService.remove(req.params.id, req.user); res.json({ success: true, data: null, message: 'Xóa thành công' }); }
    catch (e) { next(e); }
  },
  async register(req, res, next) {
    try { const r = await customerService.register(req.validatedData); res.status(201).json({ success: true, data: r, message: 'Đăng ký thành công. Bạn có thể đăng nhập ngay.' }); }
    catch (e) { next(e); }
  },
  async login(req, res, next) {
    try { const r = await customerService.login(req.validatedData.login || req.validatedData.email, req.validatedData.password); res.json({ success: true, data: r, message: 'Đăng nhập thành công' }); }
    catch (e) { next(e); }
  },
  async verifyAccount(req, res, next) {
    try { const r = await customerService.verifyEmail(req.validatedData.token); res.json({ success: true, data: r, message: 'Xác thực tài khoản thành công. Bạn có thể đăng nhập ngay bây giờ.' }); }
    catch (e) { next(e); }
  },
  async resendVerification(req, res, next) {
    try { const r = await customerService.resendVerification(req.validatedData.email); res.json({ success: true, data: r, message: 'Email đã được xác minh trong chế độ Demo.' }); }
    catch (e) { next(e); }
  },
  async getMe(req, res, next) {
    try { const c = await customerService.getMe(req.user.id); res.json({ success: true, data: c, message: 'OK' }); }
    catch (e) { next(e); }
  },
  async updateMe(req, res, next) {
    try { await customerService.updateMe(req.user.id, req.validatedData); res.json({ success: true, data: null, message: 'Cập nhật thành công' }); }
    catch (e) { next(e); }
  },
  async changeMyPassword(req, res, next) {
    try { await customerService.changeMyPassword(req.user.id, req.validatedData.currentPassword, req.validatedData.newPassword); res.json({ success: true, data: null, message: 'Đổi mật khẩu thành công' }); }
    catch (e) { next(e); }
  },
  async getMyBookings(req, res, next) {
    try { const rows = await customerService.getMyBookings(req.user.id); res.json({ success: true, data: rows, message: 'OK' }); }
    catch (e) { next(e); }
  },
  async updateMyBooking(req, res, next) {
    try {
      await customerService.updateMyBooking(req.user.id, req.params.id, req.validatedData);
      res.json({ success: true, data: null, message: 'Cập nhật đặt phòng thành công' });
    } catch (e) { next(e); }
  },
  async cancelMyBooking(req, res, next) {
    try {
      await customerService.cancelMyBooking(req.user.id, req.params.id);
      res.json({ success: true, data: null, message: 'Hủy đặt phòng thành công' });
    } catch (e) { next(e); }
  },
  async exportTempResidence(req, res, next) {
    try {
      const from = req.query.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const to = req.query.to || new Date().toISOString().slice(0, 10);
      const format = req.query.format || 'excel';
      const result = await exportService.tempResidence(from + ' 00:00:00', to + ' 23:59:59', format);
      if (format === 'excel') {
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="khai-bao-tam-tru-${from}-to-${to}.xlsx"`);
        return res.send(Buffer.from(result.buffer));
      }
      res.json({ success: true, data: result.data, message: 'OK' });
    } catch (e) { next(e); }
  },
};
