import { Router } from 'express';
import { z } from 'zod';
import { backupController } from '../controllers/backup.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const restoreSchema = z.object({ filename: z.string().regex(/^[a-zA-Z0-9_.-]+\.json$/) });

router.get('/', authenticate, requireAdmin, backupController.list);
router.post('/', authenticate, requireAdmin, backupController.create);
router.post('/restore', authenticate, requireAdmin, validate(restoreSchema), backupController.restore);

export default router;
