import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticate, requireStaff, requireCustomer, requireLeTanOrQuanLy } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { refundSchema, onlinePaymentSchema } from '../validators/payment.validator.js';

const router = Router();

router.get('/', authenticate, requireStaff, paymentController.listAll);

router.post('/online', authenticate, requireCustomer, validate(onlinePaymentSchema), paymentController.onlinePayment);
router.post('/:id/refund', authenticate, requireLeTanOrQuanLy, validate(refundSchema), paymentController.refund);

export default router;
