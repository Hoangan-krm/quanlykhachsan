import { Router } from 'express';
import { serviceController } from '../controllers/service.controller.js';
import { authenticate, requireAdmin, requireStaff } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createServiceSchema, updateServiceSchema, updateServiceStatusSchema } from '../validators/service.validator.js';

const router = Router();
router.get('/', authenticate, requireStaff, serviceController.list);
router.get('/active', authenticate, requireStaff, serviceController.listActive);
router.get('/:id', authenticate, requireStaff, serviceController.getById);
router.post('/', authenticate, requireAdmin, validate(createServiceSchema), serviceController.create);
router.put('/:id', authenticate, requireAdmin, validate(updateServiceSchema), serviceController.update);
router.patch('/:id/status', authenticate, requireAdmin, validate(updateServiceStatusSchema), serviceController.updateStatus);
router.delete('/:id', authenticate, requireAdmin, serviceController.remove);
export default router;
