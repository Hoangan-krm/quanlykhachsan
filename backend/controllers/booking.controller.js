import { bookingService } from '../services/bookingService.js';
import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';

export const bookingController = {
  async list(req, res, next) {
    try { const p = parsePagination(req.query); const { rows, total } = await bookingService.list({ ...p, trang_thai: req.query.trang_thai, khach_hang_id: req.query.khach_hang_id, from: req.query.from, to: req.query.to }); res.json(buildPaginationResponse(rows, total, p.page, p.limit)); }
    catch (e) { next(e); }
  },
  async getById(req, res, next) {
    try { const b = await bookingService.getById(req.params.id); res.json({ success: true, data: b, message: 'OK' }); }
    catch (e) { next(e); }
  },
  async create(req, res, next) {
    try { const b = await bookingService.create(req.validatedData, req.user); res.status(201).json({ success: true, data: b, message: 'Đặt phòng thành công' }); }
    catch (e) { next(e); }
  },
  async guestBooking(req, res, next) {
    try { const b = await bookingService.guestBooking(req.validatedData, req.user); res.status(201).json({ success: true, data: b, message: 'Đặt phòng thành công' }); }
    catch (e) { next(e); }
  },
  async update(req, res, next) {
    try { await bookingService.update(req.params.id, req.validatedData, req.user); res.json({ success: true, data: null, message: 'Cập nhật thành công' }); }
    catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await bookingService.remove(req.params.id, req.user); res.json({ success: true, data: null, message: 'Xóa thành công' }); }
    catch (e) { next(e); }
  },
  async cancel(req, res, next) {
    try { await bookingService.cancel(req.params.id, req.user); res.json({ success: true, data: null, message: 'Hủy đặt phòng thành công' }); }
    catch (e) { next(e); }
  },
  async markNoShow(req, res, next) {
    try { await bookingService.markNoShow(req.params.id, req.user); res.json({ success: true, data: null, message: 'Đánh dấu vắng mặt thành công' }); }
    catch (e) { next(e); }
  },
  async checkIn(req, res, next) {
    try { await bookingService.checkIn(req.params.id, req.user); res.json({ success: true, data: null, message: 'Nhận phòng thành công' }); }
    catch (e) { next(e); }
  },
  async checkOut(req, res, next) {
    try { await bookingService.checkOut(req.params.id, req.user); res.json({ success: true, data: null, message: 'Trả phòng thành công' }); }
    catch (e) { next(e); }
  },
  async transferRoom(req, res, next) {
    try { await bookingService.transferRoom(req.params.id, req.validatedData.new_phong_id, req.user); res.json({ success: true, data: null, message: 'Chuyển phòng thành công' }); }
    catch (e) { next(e); }
  },
  async extendStay(req, res, next) {
    try { await bookingService.extendStay(req.params.id, req.validatedData.ngay_check_out, req.user, req.validatedData.phu_phi_tra_muon); res.json({ success: true, data: null, message: 'Gia hạn thành công' }); }
    catch (e) { next(e); }
  },
  async refundDeposit(req, res, next) {
    try {
      const r = await bookingService.refundDeposit(req.params.id, req.validatedData.so_tien, req.validatedData.ly_do, req.user);
      res.json({ success: true, data: r, message: 'Hoàn tiền cọc thành công' });
    } catch (e) { next(e); }
  },
  async addService(req, res, next) {
    try { const s = await bookingService.addService(req.params.id, req.validatedData.dich_vu_id, req.validatedData.so_luong, req.user); res.status(201).json({ success: true, data: s, message: 'Thêm dịch vụ thành công' }); }
    catch (e) { next(e); }
  },
  async removeService(req, res, next) {
    try { await bookingService.removeService(req.params.id, req.params.sddvId, req.user); res.json({ success: true, data: null, message: 'Xóa dịch vụ thành công' }); }
    catch (e) { next(e); }
  },
  async applyPromo(req, res, next) {
    try { const r = await bookingService.applyPromo(req.params.id, req.validatedData.ma, req.user); res.json({ success: true, data: r, message: 'Áp dụng mã giảm giá thành công' }); }
    catch (e) { next(e); }
  },
  async validatePromo(req, res, next) {
    try { const r = await bookingService.validatePromo(req.validatedData.ma, req.validatedData.so_tien); res.json({ success: true, data: r, message: 'Mã giảm giá hợp lệ' }); }
    catch (e) { next(e); }
  },
  async guestLookup(req, res, next) {
    try { const r = await bookingService.guestLookup(req.validatedData.booking_code, req.validatedData.sdt_or_email); res.json({ success: true, data: r, message: 'OK' }); }
    catch (e) { next(e); }
  },
  async calculateStayDays(req, res, next) {
    try { const r = await bookingService.calculateStayDays(req.params.id); res.json({ success: true, data: r, message: 'OK' }); }
    catch (e) { next(e); }
  },
};
