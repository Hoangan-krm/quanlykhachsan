import { backupService } from '../services/backupService.js';

export const backupController = {
  async list(req, res, next) {
    try {
      const [files, logs] = await Promise.all([backupService.list(), backupService.listBackupLogs()]);
      res.json({ success: true, data: { files, logs }, message: 'OK' });
    } catch (error) { next(error); }
  },
  async create(req, res, next) {
    try {
      const result = await backupService.backup(req.user);
      res.status(201).json({ success: true, data: result, message: 'Sao lưu thành công' });
    } catch (error) { next(error); }
  },
  async restore(req, res, next) {
    try {
      const result = await backupService.restore(req.validatedData.filename, req.user);
      res.json({ success: true, data: result, message: 'Khôi phục thành công' });
    } catch (error) { next(error); }
  },
};
