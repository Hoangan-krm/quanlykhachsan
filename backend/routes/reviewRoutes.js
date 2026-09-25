import { Router } from 'express';
import { reviewController } from '../controllers/review.controller.js';
import { authenticate, requireAdminOrQuanLy, requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reviewSchema, moderateReviewSchema } from '../validators/misc.validators.js';

const router = Router();

router.get('/', authenticate, requireAdminOrQuanLy, reviewController.list);
router.get('/public', reviewController.listPublic);
router.post('/', authenticate, requireCustomer, validate(reviewSchema), reviewController.submit);
router.post('/:id/moderate', authenticate, requireAdminOrQuanLy, validate(moderateReviewSchema), reviewController.moderate);

export default router;
