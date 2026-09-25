import { Router } from 'express';
import { staffController } from '../controllers/staff.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createStaffSchema, updateStaffSchema } from '../validators/staff.validator.js';

const router = Router();

router.get('/', authenticate, requireAdmin, staffController.list);
router.get('/:id', authenticate, requireAdmin, staffController.getById);
router.post('/', authenticate, requireAdmin, validate(createStaffSchema), staffController.create);
router.put('/:id', authenticate, requireAdmin, validate(updateStaffSchema), staffController.update);
router.patch('/:id/lock', authenticate, requireAdmin, staffController.lock);
router.patch('/:id/unlock', authenticate, requireAdmin, staffController.unlock);
router.delete('/:id', authenticate, requireAdmin, staffController.remove);

export default router;
