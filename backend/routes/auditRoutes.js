import { Router } from 'express';
import { auditController } from '../controllers/audit.controller.js';
import { authenticate, requireAdminOrQuanLy } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireAdminOrQuanLy, auditController.list);

export default router;
