import { chatService } from '../services/chatService.js';

export const chatController = {
  async sendMessage(req, res, next) {
    try {
      const result = await chatService.sendMessage(req.user.id, req.validatedData.noi_dung);
      res.status(201).json({ success: true, data: result, message: 'Gửi tin nhắn thành công' });
    } catch (e) { next(e); }
  },
  async listConversations(req, res, next) {
    try {
      const data = await chatService.listConversations({ trang_thai: req.query.trang_thai });
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
  async getCustomerMessages(req, res, next) {
    try {
      const data = await chatService.getCustomerMessages(req.user.id);
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
  async getMessages(req, res, next) {
    try {
      const data = await chatService.getMessages(req.params.id, req.user);
      res.json({ success: true, data, message: 'OK' });
    } catch (e) { next(e); }
  },
  async staffReply(req, res, next) {
    try {
      const result = await chatService.staffReply(req.params.id, req.user.id, req.validatedData.noi_dung);
      res.status(201).json({ success: true, data: result, message: 'Gửi trả lời thành công' });
    } catch (e) { next(e); }
  },
  async getUnreadCount(req, res, next) {
    try {
      const total = await chatService.getUnreadCount();
      res.json({ success: true, data: { total }, message: 'OK' });
    } catch (e) { next(e); }
  },
  async markRead(req, res, next) {
    try {
      const readerRole = req.user?.vai_tro === 'Customer' ? 'Customer' : 'Staff';
      await chatService.markRead(req.params.id, readerRole, req.user);
      res.json({ success: true, data: null, message: 'Đánh dấu đã đọc thành công' });
    } catch (e) { next(e); }
  },
};
