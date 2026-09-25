import { promoService } from '../services/promoService.js';

export const promoController = {
  async list(req, res, next) {
    try {
      const data = await promoService.list();
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const data = await promoService.create(req.validatedData);
      res.status(201).json({ success: true, data, message: 'Tạo mã giảm giá thành công' });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      await promoService.update(req.params.id, req.validatedData);
      res.json({ success: true, data: null, message: 'Cập nhật thành công' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try {
      await promoService.remove(req.params.id);
      res.json({ success: true, data: null, message: 'Xóa thành công' });
    } catch (e) { next(e); }
  },
};
