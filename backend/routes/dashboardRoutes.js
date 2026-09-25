import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate, requireStaff } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, requireStaff, dashboardController.stats);

export default router;
