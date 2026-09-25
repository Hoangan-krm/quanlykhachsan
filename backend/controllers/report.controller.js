import { reportService } from '../services/reportService.js';
import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';

export const reportController = {
  async revenue(req, res, next) {
    try {
      const from = req.query.from || new Date().toISOString().slice(0, 10);
      const to = req.query.to || new Date().toISOString().slice(0, 10);
      const groupBy = req.query.groupBy || 'day';
      const data = await reportService.revenue(from, to, groupBy);
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
  async occupancy(req, res, next) {
    try {
      const from = req.query.from || new Date().toISOString().slice(0, 10);
      const to = req.query.to || new Date().toISOString().slice(0, 10);
      const data = await reportService.occupancy(from, to);
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
  async shiftReport(req, res, next) {
    try {
      const from = req.query.from || new Date().toISOString().slice(0, 10);
      const to = req.query.to || new Date().toISOString().slice(0, 10);
      const staffId = req.query.staff_id ? parseInt(req.query.staff_id, 10) : null;
      const data = await reportService.shiftReport(from, to, staffId);
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
  async history(req, res, next) {
    try {
      const p = parsePagination(req.query);
      const { rows, total } = await reportService.history({
        staffId: req.query.staff_id,
        from: req.query.from,
        to: req.query.to,
        action: req.query.action,
        page: p.page,
        limit: p.limit,
        offset: p.offset,
      });
      res.json(buildPaginationResponse(rows, total, p.page, p.limit));
    } catch (e) { next(e); }
  },
};
