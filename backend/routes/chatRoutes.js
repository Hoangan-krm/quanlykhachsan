import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { authenticate, requireStaff, requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendMessageSchema, staffReplySchema } from '../validators/chat.validator.js';

const router = Router();

router.post('/messages', authenticate, requireCustomer, validate(sendMessageSchema), chatController.sendMessage);
router.get('/messages', authenticate, requireCustomer, chatController.getCustomerMessages);
router.get('/conversations', authenticate, requireStaff, chatController.listConversations);
router.get('/conversations/unread', authenticate, requireStaff, chatController.getUnreadCount);
router.get('/conversations/:id/messages', authenticate, chatController.getMessages);
router.post('/conversations/:id/reply', authenticate, requireStaff, validate(staffReplySchema), chatController.staffReply);
router.post('/conversations/:id/mark-read', authenticate, chatController.markRead);

export default router;
