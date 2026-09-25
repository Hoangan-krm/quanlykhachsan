import { staffService } from '../services/staffService.js';
import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';

export const staffController = {
  async list(req, res, next) {
    try {
      const pagination = parsePagination(req.query);
      const { rows, total } = await staffService.list({ ...pagination, vai_tro: req.query.vai_tro });
      res.json(buildPaginationResponse(rows, total, pagination.page, pagination.limit));
    } catch (e) { next(e); }
  },
  async getById(req, res, next) {
    try {
      const user = await staffService.getById(req.params.id);
      res.json({ success: true, data: user, message: 'OK' });
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const user = await staffService.create(req.validatedData, req.user);
      res.status(201).json({ success: true, data: user, message: 'Tạo nhân viên thành công' });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      await staffService.update(req.params.id, req.validatedData, req.user);
      res.json({ success: true, data: null, message: 'Cập nhật thành công' });
    } catch (e) { next(e); }
  },
  async lock(req, res, next) {
    try {
      await staffService.lock(req.params.id, req.user);
      res.json({ success: true, data: null, message: 'Khóa tài khoản thành công' });
    } catch (e) { next(e); }
  },
  async unlock(req, res, next) {
    try {
      await staffService.unlock(req.params.id, req.user);
      res.json({ success: true, data: null, message: 'Mở khóa tài khoản thành công' });
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try {
      await staffService.remove(req.params.id, req.user);
      res.json({ success: true, data: null, message: 'Xóa nhân viên thành công' });
    } catch (e) { next(e); }
  },
};
