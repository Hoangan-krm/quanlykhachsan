import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate, requireStaff } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, requireStaff, validate(changePasswordSchema), authController.changePassword);
router.post('/forgot-password', loginLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', loginLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.get('/me', authenticate, requireStaff, authController.me);

export default router;
