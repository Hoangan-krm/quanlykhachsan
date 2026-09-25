import { paymentService } from '../services/paymentService.js';
import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';

export const paymentController = {
  async listAll(req, res, next) {
    try {
      const p = parsePagination(req.query);
      const { rows, total } = await paymentService.listAll({ ...p, hinh_thuc: req.query.hinh_thuc, from: req.query.from, to: req.query.to });
      res.json(buildPaginationResponse(rows, total, p.page, p.limit));
    } catch (e) { next(e); }
  },
  async listByInvoice(req, res, next) { try { const r = await paymentService.listByInvoice(req.params.id); res.json({ success: true, data: r, message: 'OK' }); } catch (e) { next(e); } },
  async record(req, res, next) { try { const r = await paymentService.record(req.params.id, req.validatedData.so_tien, req.validatedData.hinh_thuc, req.user?.id, req.user, req.validatedData.ghi_chu); res.status(201).json({ success: true, data: r, message: 'Thanh toán thành công' }); } catch (e) { next(e); } },
  async refund(req, res, next) { try { const r = await paymentService.refund(req.params.id, req.validatedData.reason, req.user, req.validatedData.so_tien); res.json({ success: true, data: r, message: 'Hoàn tiền thành công' }); } catch (e) { next(e); } },
  async onlinePayment(req, res, next) { try { const r = await paymentService.onlinePayment(req.validatedData.booking_id, req.validatedData.amount, req.validatedData.gateway_token, req.user); res.json({ success: true, data: r, message: 'Thanh toán online thành công' }); } catch (e) { next(e); } },
};
