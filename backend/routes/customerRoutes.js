import { Router } from 'express';
import { customerController } from '../controllers/customer.controller.js';
import { authenticate, requireStaff, requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { createCustomerSchema, updateCustomerSchema, registerSchema, customerLoginSchema } from '../validators/customer.validator.js';
import { customerUpdateBookingSchema } from '../validators/booking.validator.js';
import { changePasswordSchema } from '../validators/auth.validator.js';
import { verifyAccountSchema, resendVerificationSchema } from '../validators/misc.validators.js';

const router = Router();

router.get('/', authenticate, requireStaff, customerController.list);
router.get('/search', authenticate, requireStaff, customerController.search);
router.get('/export/temp-residence', authenticate, requireStaff, customerController.exportTempResidence);
router.get('/me', authenticate, requireCustomer, customerController.getMe);
router.get('/me/bookings', authenticate, requireCustomer, customerController.getMyBookings);
router.put('/me/bookings/:id', authenticate, requireCustomer, validate(customerUpdateBookingSchema), customerController.updateMyBooking);
router.post('/me/bookings/:id/cancel', authenticate, requireCustomer, customerController.cancelMyBooking);
router.get('/:id', authenticate, requireStaff, customerController.getById);
router.post('/', authenticate, requireStaff, validate(createCustomerSchema), customerController.create);
router.post('/register', loginLimiter, validate(registerSchema), customerController.register);
router.post('/login', loginLimiter, validate(customerLoginSchema), customerController.login);
router.post('/verify-account', validate(verifyAccountSchema), customerController.verifyAccount);
router.post('/resend-verification', loginLimiter, validate(resendVerificationSchema), customerController.resendVerification);
router.put('/me', authenticate, requireCustomer, validate(updateCustomerSchema), customerController.updateMe);
router.put('/me/password', authenticate, requireCustomer, validate(changePasswordSchema), customerController.changeMyPassword);
router.put('/:id', authenticate, requireStaff, validate(updateCustomerSchema), customerController.update);
router.delete('/:id', authenticate, requireStaff, customerController.remove);

export default router;
