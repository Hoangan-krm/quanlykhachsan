import { reviewService } from '../services/reviewService.js';
import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';

export const reviewController = {
  async list(req, res, next) {
    try {
      const p = parsePagination(req.query);
      const { rows, total } = await reviewService.list({ ...p, trang_thai_duyet: req.query.trang_thai_duyet });
      res.json(buildPaginationResponse(rows, total, p.page, p.limit));
    } catch (e) { next(e); }
  },
  async listPublic(req, res, next) {
    try {
      const data = await reviewService.listPublic();
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
  async submit(req, res, next) {
    try {
      const data = await reviewService.submit(
        req.user.id,
        req.validatedData.dat_phong_id,
        req.validatedData.so_sao,
        req.validatedData.noi_dung,
        req.user
      );
      res.status(201).json({ success: true, data, message: 'Gửi đánh giá thành công' });
    } catch (e) { next(e); }
  },
  async moderate(req, res, next) {
    try {
      await reviewService.moderate(req.params.id, req.validatedData.trang_thai_duyet, req.user);
      res.json({ success: true, data: null, message: 'Duyệt đánh giá thành công' });
    } catch (e) { next(e); }
  },
};
