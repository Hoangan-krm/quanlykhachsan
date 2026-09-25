import { reportService } from '../services/reportService.js';

export const dashboardController = {
  async stats(req, res, next) {
    try {
      const data = await reportService.dashboardStats();
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
};
