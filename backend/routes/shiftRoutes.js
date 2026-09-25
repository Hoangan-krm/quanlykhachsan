import { Router } from 'express';
import { shiftController } from '../controllers/shift.controller.js';
import { authenticate, requireStaff, requireLeTanOrQuanLy } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { openShiftSchema, closeShiftSchema } from '../validators/misc.validators.js';

const router = Router();

router.get('/', authenticate, requireStaff, shiftController.list);
router.get('/current', authenticate, requireLeTanOrQuanLy, shiftController.currentOpen);
router.post('/open', authenticate, requireLeTanOrQuanLy, validate(openShiftSchema), shiftController.open);
router.post('/:id/close', authenticate, requireLeTanOrQuanLy, validate(closeShiftSchema), shiftController.close);

export default router;
