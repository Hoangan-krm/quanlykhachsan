import { chatRepository } from '../repositories/chat.repository.js';
import { nguoiDungRepository } from '../repositories/nguoiDung.repository.js';
import { auditLogService } from './auditLogService.js';
import { withTransaction } from '../config/db.js';
import { createError } from '../utils/errors.js';

export const chatService = {
  async sendMessage(customerId, noiDung) {
    let conversation = await chatRepository.findConversationByCustomerId(customerId);
    if (!conversation) {
      conversation = await chatRepository.createConversation(customerId);
    }
    const message = await chatRepository.addMessage(conversation.id, 'Customer', noiDung);
    return { conversation, message };
  },

  async listConversations({ trang_thai } = {}) {
    return chatRepository.listConversations({ trang_thai });
  },

  async getCustomerMessages(customerId) {
    const conversation = await chatRepository.findConversationByCustomerId(customerId);
    if (!conversation) return { conversation: null, messages: [] };
    const messages = await chatRepository.findMessagesByConversationId(conversation.id);
    return { conversation, messages };
  },

  async getMessages(conversationId, user) {
    const conversation = await chatRepository.findConversationById(conversationId);
    if (!conversation) throw createError('NOT_FOUND');
    if (user?.vai_tro === 'Customer' && Number(conversation.khach_hang_id) !== Number(user.id)) {
      throw createError('PERMISSION_DENIED');
    }
    const messages = await chatRepository.findMessagesByConversationId(conversationId);
    return { conversation, messages };
  },

  async staffReply(conversationId, staffId, noiDung) {
    const conversation = await chatRepository.findConversationById(conversationId);
    if (!conversation) throw createError('NOT_FOUND');
    // Ba ghi chép phải đồng thời: tin nhắn + đánh dấu đã đọc + trạng thái hội thoại.
    await withTransaction(async conn => {
      await chatRepository.addMessage(conversationId, 'Staff', noiDung, conn);
      await chatRepository.markMessagesRead(conversationId, 'Staff', conn);
      await chatRepository.updateConversationStatus(conversationId, 'Answered', conn);
    });
    const staff = await nguoiDungRepository.findById(staffId);
    await auditLogService.log(staff || { id: staffId, ho_ten: `Staff#${staffId}` }, 'chat_reply', `Trả lời cuộc trò chuyện #${conversationId}`);
    const message = await chatRepository.findMessagesByConversationId(conversationId);
    return { conversation, message: message[message.length - 1] };
  },

  async getUnreadCount() {
    return chatRepository.countUnreadFromCustomers();
  },

  async markRead(conversationId, readerRole, user) {
    const conversation = await chatRepository.findConversationById(conversationId);
    if (!conversation) throw createError('NOT_FOUND');
    if (user?.vai_tro === 'Customer' && Number(conversation.khach_hang_id) !== Number(user.id)) {
      throw createError('PERMISSION_DENIED');
    }
    return chatRepository.markMessagesRead(conversationId, readerRole);
  },
};
