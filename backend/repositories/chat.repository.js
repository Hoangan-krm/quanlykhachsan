import { pool } from '../config/db.js';

export const chatRepository = {
  async findConversationByCustomerId(customerId) {
    const [rows] = await pool.execute(
      'SELECT * FROM CUOC_TRO_CHUYEN WHERE khach_hang_id = ? ORDER BY created_at DESC LIMIT 1',
      [customerId]
    );
    return rows[0] || null;
  },

  async createConversation(khachHangId) {
    const [result] = await pool.execute(
      'INSERT INTO CUOC_TRO_CHUYEN (khach_hang_id, trang_thai) VALUES (?, ?)',
      [khachHangId, 'Pending']
    );
    return { id: result.insertId, khach_hang_id: khachHangId, trang_thai: 'Pending' };
  },

  async findConversationById(id) {
    const [rows] = await pool.execute(
      `SELECT ctc.*, kh.ho_ten as ten_khach, kh.sdt as sdt_khach, kh.email as email_khach
       FROM CUOC_TRO_CHUYEN ctc
       JOIN KHACH_HANG kh ON ctc.khach_hang_id = kh.id
       WHERE ctc.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async listConversations({ trang_thai } = {}) {
    let sql = `SELECT ctc.*, kh.ho_ten as ten_khach, kh.sdt as sdt_khach, kh.email as email_khach,
                 (SELECT COUNT(*) FROM TIN_NHAN tn WHERE tn.conversation_id = ctc.id AND tn.is_read = FALSE AND tn.sender_role = 'Customer') as unread_count
               FROM CUOC_TRO_CHUYEN ctc
               JOIN KHACH_HANG kh ON ctc.khach_hang_id = kh.id`;
    const params = [];
    if (trang_thai) {
      sql += ' WHERE ctc.trang_thai = ?';
      params.push(trang_thai);
    }
    sql += ' ORDER BY ctc.updated_at DESC';
    const [rows] = await pool.execute(sql, params);
    return rows;
  },

  async addMessage(conversationId, senderRole, noiDung, conn = null) {
    const executor = conn || pool;
    const [result] = await executor.execute(
      'INSERT INTO TIN_NHAN (conversation_id, sender_role, noi_dung, is_read) VALUES (?, ?, ?, ?)',
      [conversationId, senderRole, noiDung, false]
    );
    return { id: result.insertId, conversation_id: conversationId, sender_role: senderRole, noi_dung: noiDung, is_read: false };
  },

  async findMessagesByConversationId(conversationId) {
    const [rows] = await pool.execute(
      'SELECT * FROM TIN_NHAN WHERE conversation_id = ? ORDER BY thoi_gian ASC',
      [conversationId]
    );
    return rows;
  },

  async markMessagesRead(conversationId, readerRole, conn = null) {
    const executor = conn || pool;
    const [result] = await executor.execute(
      'UPDATE TIN_NHAN SET is_read = TRUE WHERE conversation_id = ? AND sender_role != ?',
      [conversationId, readerRole]
    );
    return result.affectedRows > 0;
  },

  async updateConversationStatus(id, trangThai, conn = null) {
    const executor = conn || pool;
    const [result] = await executor.execute(
      'UPDATE CUOC_TRO_CHUYEN SET trang_thai = ? WHERE id = ?',
      [trangThai, id]
    );
    return result.affectedRows > 0;
  },

  async countUnreadFromCustomers() {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as total FROM TIN_NHAN tn
       WHERE tn.is_read = FALSE AND tn.sender_role = 'Customer'`
    );
    return rows[0].total;
  },
};
