import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate, requireAdminOrQuanLy, requireStaff } from '../middleware/auth.js';

const router = Router();

router.get('/revenue', authenticate, requireAdminOrQuanLy, reportController.revenue);
router.get('/occupancy', authenticate, requireAdminOrQuanLy, reportController.occupancy);
router.get('/shifts', authenticate, requireAdminOrQuanLy, reportController.shiftReport);
router.get('/history', authenticate, requireStaff, reportController.history);

export default router;
