import { Router } from 'express';
import { promoController } from '../controllers/promo.controller.js';
import { authenticate, requireAdminOrQuanLy } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { promoSchema, updatePromoSchema } from '../validators/misc.validators.js';

const router = Router();

router.get('/', authenticate, requireAdminOrQuanLy, promoController.list);
router.post('/', authenticate, requireAdminOrQuanLy, validate(promoSchema), promoController.create);
router.put('/:id', authenticate, requireAdminOrQuanLy, validate(updatePromoSchema), promoController.update);
router.delete('/:id', authenticate, requireAdminOrQuanLy, promoController.remove);

export default router;
