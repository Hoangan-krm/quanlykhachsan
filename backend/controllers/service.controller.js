import { serviceService } from '../services/serviceService.js';
import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';
export const serviceController = {
  async list(req, res, next) {
    try {
      const p = parsePagination(req.query);
      const result = await serviceService.list(p);
      if (Array.isArray(result)) {
        res.json({ success: true, data: result, message: 'OK' });
      } else {
        res.json(buildPaginationResponse(result.rows, result.total, p.page, p.limit));
      }
    } catch (e) { next(e); }
  },
  async listActive(req, res, next) { try { const r = await serviceService.listActive(); res.json({ success: true, data: r, message: 'OK' }); } catch (e) { next(e); } },
  async getById(req, res, next) { try { const r = await serviceService.getById(req.params.id); res.json({ success: true, data: r, message: 'OK' }); } catch (e) { next(e); } },
  async create(req, res, next) { try { const r = await serviceService.create(req.validatedData); res.status(201).json({ success: true, data: r, message: 'Tạo dịch vụ thành công' }); } catch (e) { next(e); } },
  async update(req, res, next) { try { await serviceService.update(req.params.id, req.validatedData); res.json({ success: true, data: null, message: 'Cập nhật thành công' }); } catch (e) { next(e); } },
  async updateStatus(req, res, next) { try { await serviceService.updateStatus(req.params.id, req.validatedData.trang_thai); res.json({ success: true, data: null, message: 'Cập nhật trạng thái thành công' }); } catch (e) { next(e); } },
  async remove(req, res, next) { try { await serviceService.remove(req.params.id); res.json({ success: true, data: null, message: 'Xóa thành công' }); } catch (e) { next(e); } },
};
