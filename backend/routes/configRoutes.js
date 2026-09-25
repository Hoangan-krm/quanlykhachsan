import { Router } from 'express';
import { configController } from '../controllers/config.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { configSchema } from '../validators/misc.validators.js';

const router = Router();

router.get('/public', configController.getPublic);
router.get('/', authenticate, requireAdmin, configController.getAdmin);
router.put('/', authenticate, requireAdmin, validate(configSchema), configController.update);

export default router;
