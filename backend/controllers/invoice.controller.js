import { invoiceService } from '../services/invoiceService.js';
import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';

export const invoiceController = {
  async list(req, res, next) { try { const p = parsePagination(req.query); const { rows, total } = await invoiceService.list({ ...p, trang_thai_thanh_toan: req.query.trang_thai_thanh_toan }); res.json(buildPaginationResponse(rows, total, p.page, p.limit)); } catch (e) { next(e); } },
  async getById(req, res, next) { try { const r = await invoiceService.getById(req.params.id); res.json({ success: true, data: r, message: 'OK' }); } catch (e) { next(e); } },
  async getByBooking(req, res, next) { try { const r = await invoiceService.getByBookingId(req.params.bookingId); res.json({ success: true, data: r, message: 'OK' }); } catch (e) { next(e); } },
  async generate(req, res, next) { try { const r = await invoiceService.generate(req.validatedData.dat_phong_id, req.user); res.status(201).json({ success: true, data: r, message: 'Tạo hóa đơn thành công' }); } catch (e) { next(e); } },
  async getPdf(req, res, next) { try { const doc = await invoiceService.generatePdf(req.params.id); res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}.pdf"`); doc.pipe(res); } catch (e) { next(e); } },
};
