import { Router } from 'express';
import { roomTypeController } from '../controllers/roomType.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createRoomTypeSchema, updateRoomTypeSchema } from '../validators/roomType.validator.js';

const router = Router();

router.get('/', roomTypeController.list);
router.get('/:id', roomTypeController.getById);
router.post('/', authenticate, requireAdmin, validate(createRoomTypeSchema), roomTypeController.create);
router.put('/:id', authenticate, requireAdmin, validate(updateRoomTypeSchema), roomTypeController.update);
router.delete('/:id', authenticate, requireAdmin, roomTypeController.remove);

export default router;
