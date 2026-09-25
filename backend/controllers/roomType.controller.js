import { roomTypeService } from '../services/roomTypeService.js';

export const roomTypeController = {
  async list(req, res, next) {
    try { const rows = await roomTypeService.list(); res.json({ success: true, data: rows, message: 'OK' }); }
    catch (e) { next(e); }
  },
  async getById(req, res, next) {
    try { const rt = await roomTypeService.getById(req.params.id); res.json({ success: true, data: rt, message: 'OK' }); }
    catch (e) { next(e); }
  },
  async create(req, res, next) {
    try { const rt = await roomTypeService.create(req.validatedData); res.status(201).json({ success: true, data: rt, message: 'Tạo loại phòng thành công' }); }
    catch (e) { next(e); }
  },
  async update(req, res, next) {
    try { await roomTypeService.update(req.params.id, req.validatedData); res.json({ success: true, data: null, message: 'Cập nhật thành công' }); }
    catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try { await roomTypeService.remove(req.params.id); res.json({ success: true, data: null, message: 'Xóa thành công' }); }
    catch (e) { next(e); }
  },
};
