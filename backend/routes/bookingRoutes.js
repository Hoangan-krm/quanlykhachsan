import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { authenticate, requireStaff, requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createBookingSchema, updateBookingSchema, guestBookingSchema, transferRoomSchema, extendStaySchema, addServiceSchema, applyPromoSchema, refundDepositSchema, validatePromoSchema } from '../validators/booking.validator.js';
import { guestLookupSchema } from '../validators/chat.validator.js';
import { guestActionLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/', authenticate, requireStaff, bookingController.list);
router.get('/:id', authenticate, requireStaff, bookingController.getById);
router.get('/:id/stay-days', authenticate, requireStaff, bookingController.calculateStayDays);
router.post('/', authenticate, validate(createBookingSchema), bookingController.create);
router.post('/guest', validate(guestBookingSchema), bookingController.guestBooking);
router.post('/guest/lookup', validate(guestLookupSchema), bookingController.guestLookup);
router.post('/validate-promo', guestActionLimiter, validate(validatePromoSchema), bookingController.validatePromo);
router.put('/:id', authenticate, requireStaff, validate(updateBookingSchema), bookingController.update);
router.delete('/:id', authenticate, requireStaff, bookingController.remove);
router.post('/:id/cancel', authenticate, requireStaff, bookingController.cancel);
router.post('/:id/no-show', authenticate, requireStaff, bookingController.markNoShow);
router.post('/:id/refund-deposit', authenticate, requireStaff, validate(refundDepositSchema), bookingController.refundDeposit);
router.post('/:id/check-in', authenticate, requireStaff, bookingController.checkIn);
router.post('/:id/check-out', authenticate, requireStaff, bookingController.checkOut);
router.post('/:id/transfer-room', authenticate, requireStaff, validate(transferRoomSchema), bookingController.transferRoom);
router.put('/:id/extend', authenticate, requireStaff, validate(extendStaySchema), bookingController.extendStay);
router.post('/:id/services', authenticate, requireStaff, validate(addServiceSchema), bookingController.addService);
router.delete('/:id/services/:sddvId', authenticate, requireStaff, bookingController.removeService);
router.post('/:id/promo', authenticate, validate(applyPromoSchema), bookingController.applyPromo);

export default router;
