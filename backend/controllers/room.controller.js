import { roomService } from '../services/roomService.js';
import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';

export const roomController = {
  async list(req, res, next) {
    try {
      const p = parsePagination(req.query);
      const { rows, total } = await roomService.list({ ...p, trang_thai: req.query.trang_thai, loai_phong_id: req.query.loai_phong_id });
      res.json(buildPaginationResponse(rows, total, p.page, p.limit));
    } catch (e) { next(e); }
  },
  async getById(req, res, next) {
    try { const r = await roomService.getById(req.params.id); res.json({ success: true, data: r, message: 'OK' }); }
    catch (e) { next(e); }
  },
  async findVacant(req, res, next) {
    try { const r = await roomService.findVacant(req.query.check_in, req.query.check_out, req.query.room_type_id); res.json({ success: true, data: r, message: 'OK' }); }
    catch (e) { next(e); }
  },
  async create(req, res, next) {
    try { const r = await roomService.create(req.validatedData, req.user); res.status(201).json({ success: true, data: r, message: 'Tạo phòng thành công' }); }
    catch (e) { next(e); }
  },
  async update(req, res, next) {
    try { await roomService.update(req.params.id, req.validatedData, req.user); res.json({ success: true, data: null, message: 'Cập nhật thành công' }); }
    catch (e) { next(e); }
  },
  async updateStatus(req, res, next) {
    try { await roomService.updateStatus(req.params.id, req.validatedData.trang_thai, req.user); res.json({ success: true, data: null, message: 'Cập nhật trạng thái thành công' }); }
    catch (e) { next(e); }
  },
  async markMaintenance(req, res, next) {
    try { await roomService.markMaintenance(req.params.id, req.user); res.json({ success: true, data: null, message: 'Đánh dấu bảo trì thành công' }); }
    catch (e) { next(e); }
  },
  async markCleaned(req, res, next) {
    try { await roomService.markCleaned(req.params.id, req.user); res.json({ success: true, data: null, message: 'Đánh dấu dọn xong thành công' }); }
    catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await roomService.remove(req.params.id, req.user); res.json({ success: true, data: null, message: 'Xóa phòng thành công' }); }
    catch (e) { next(e); }
  },
};
