import { Router } from 'express';
import { roomController } from '../controllers/room.controller.js';
import { authenticate, requireAdmin, requireLeTan, requireStaff } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createRoomSchema, updateRoomSchema, updateStatusSchema } from '../validators/room.validator.js';

const router = Router();

router.get('/', authenticate, requireStaff, roomController.list);
router.get('/vacant', roomController.findVacant);
router.get('/:id', authenticate, requireStaff, roomController.getById);
router.post('/', authenticate, requireAdmin, validate(createRoomSchema), roomController.create);
router.put('/:id', authenticate, requireAdmin, validate(updateRoomSchema), roomController.update);
router.patch('/:id/status', authenticate, requireAdmin, validate(updateStatusSchema), roomController.updateStatus);
router.patch('/:id/maintenance', authenticate, requireAdmin, roomController.markMaintenance);
router.patch('/:id/cleaned', authenticate, requireLeTan, roomController.markCleaned);
router.delete('/:id', authenticate, requireAdmin, roomController.remove);

export default router;
