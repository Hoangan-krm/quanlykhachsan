import { shiftService } from '../services/shiftService.js';
import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';

export const shiftController = {
  async list(req, res, next) {
    try {
      const p = parsePagination(req.query);
      const { rows, total } = await shiftService.list({ ...p, nguoi_dung_id: req.query.nguoi_dung_id });
      res.json(buildPaginationResponse(rows, total, p.page, p.limit));
    } catch (e) { next(e); }
  },
  async currentOpen(req, res, next) {
    try {
      const data = await shiftService.findCurrentOpen(req.user.id);
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
  async open(req, res, next) {
    try {
      const data = await shiftService.open(req.user.id, req.validatedData.tien_mat_dau_ca, req.user);
      res.status(201).json({ success: true, data, message: 'Mở ca thành công' });
    } catch (e) { next(e); }
  },
  async close(req, res, next) {
    try {
      const data = await shiftService.close(req.params.id, req.validatedData.tien_mat_cuoi_ca, req.user);
      res.json({ success: true, data, message: 'Đóng ca thành công' });
    } catch (e) { next(e); }
  },
};
