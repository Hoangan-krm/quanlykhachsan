import { auditLogService } from '../services/auditLogService.js';
import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';

export const auditController = {
  async list(req, res, next) {
    try {
      const p = parsePagination(req.query);
      const { rows, total } = await auditLogService.list({
        page: p.page,
        limit: p.limit,
        offset: p.offset,
        from: req.query.from,
        to: req.query.to,
        action: req.query.action,
        nguoi_dung: req.query.nguoi_dung,
      });
      res.json(buildPaginationResponse(rows, total, p.page, p.limit));
    } catch (e) { next(e); }
  },
};
