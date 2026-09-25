import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller.js';
import { paymentController } from '../controllers/payment.controller.js';
import { authenticate, requireStaff, requireCustomer, requireLeTanOrQuanLy } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { generateInvoiceSchema } from '../validators/invoice.validator.js';
import { recordPaymentSchema, refundSchema, onlinePaymentSchema } from '../validators/payment.validator.js';

const router = Router();

router.get('/', authenticate, requireStaff, invoiceController.list);
router.get('/:id', authenticate, requireStaff, invoiceController.getById);
router.get('/by-booking/:bookingId', authenticate, requireStaff, invoiceController.getByBooking);
router.post('/', authenticate, requireStaff, validate(generateInvoiceSchema), invoiceController.generate);
router.get('/:id/pdf', authenticate, requireStaff, invoiceController.getPdf);
router.get('/:id/payments', authenticate, requireStaff, paymentController.listByInvoice);
router.post('/:id/payments', authenticate, requireStaff, validate(recordPaymentSchema), paymentController.record);

export default router;
