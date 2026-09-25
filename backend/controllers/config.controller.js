import { configService } from '../services/configService.js';

export const configController = {
  async getPublic(req, res, next) {
    try {
      const data = await configService.getPublic();
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
  async getAdmin(req, res, next) {
    try {
      const data = await configService.getAdmin();
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      await configService.update(req.validatedData, req.user);
      res.json({ success: true, data: null, message: 'Cập nhật cấu hình thành công' });
    } catch (e) { next(e); }
  },
};
