import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('FR-47 — Live Chat / Messaging', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('FR-47: Customer sends message', () => {
    beforeAll(async () => { await resetDatabase(); });

    let customerToken;

    beforeAll(async () => {
      const registered = await auth.registerVerifiedCustomer({
        ho_ten: 'Chat Test Customer',
        sdt: '0988000111',
        email: 'chattest@example.com',
        cccd_passport: 'CHATCUST001',
        password: 'Customer123!',
      });
      customerToken = registered.token;
    });

    test('customer auth required for sending message', async () => {
      const r = await api.post('/api/chat/messages', { noi_dung: 'Hello' });
      expect(r.status).toBe(401);
    });

    test('customer sends a message → message persisted to TIN_NHAN', async () => {
      const r = await api.post('/api/chat/messages', { noi_dung: 'Xin chào, tôi cần hỗ trợ' }, customerToken);
      expect(r.status).toBe(201);
      expect(r.body.data).toBeDefined();
      expect(r.body.data.conversation).toBeDefined();
      expect(r.body.data.message).toBeDefined();
      expect(r.body.data.message.noi_dung).toBe('Xin chào, tôi cần hỗ trợ');

      const msgCount = await db.scalar("SELECT COUNT(*) AS c FROM TIN_NHAN WHERE noi_dung = 'Xin chào, tôi cần hỗ trợ'");
      expect(Number(msgCount)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('FR-47: Staff lists conversations', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('staff auth required for listing conversations', async () => {
      const r = await api.get('/api/chat/conversations');
      expect(r.status).toBe(401);
    });

    test('staff lists conversations → sees pending conversation', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/chat/conversations', token);
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body.data)).toBe(true);
      expect(r.body.data.length).toBeGreaterThanOrEqual(1);
      const pending = r.body.data.find(c => c.trang_thai === 'Pending');
      expect(pending).toBeDefined();
    });
  });

  describe('FR-47: Staff replies to conversation', () => {
    beforeAll(async () => { await resetDatabase(); });

    let conversationId;

    beforeAll(async () => {
      const { token } = await auth.loginAsLeTan();
      const listRes = await api.get('/api/chat/conversations', token);
      conversationId = listRes.body.data[0]?.id;
    });

    test('staff replies → conversation marked Answered', async () => {
      const { token } = await auth.loginAsLeTan();
      expect(conversationId).toBeDefined();
      const r = await api.post(`/api/chat/conversations/${conversationId}/reply`, { noi_dung: 'Cảm ơn quý khách đã liên hệ' }, token);
      expect(r.status).toBe(201);

      const conv = await db.findRow('CUOC_TRO_CHUYEN', { id: conversationId });
      expect(conv.trang_thai).toBe('Answered');
    });
  });

  describe('FR-47: Get messages for a conversation', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('returns message history', async () => {
      const { token } = await auth.loginAsLeTan();
      const listRes = await api.get('/api/chat/conversations', token);
      const conversationId = listRes.body.data[0]?.id;
      expect(conversationId).toBeDefined();

      const r = await api.get(`/api/chat/conversations/${conversationId}/messages`, token);
      expect(r.status).toBe(200);
      expect(r.body.data).toBeDefined();
      expect(r.body.data.messages).toBeDefined();
      expect(Array.isArray(r.body.data.messages)).toBe(true);
      expect(r.body.data.messages.length).toBeGreaterThanOrEqual(1);
    });

    test('customer can read own conversation but cannot read another customer conversation', async () => {
      const owner = await auth.registerVerifiedCustomer({
        ho_ten: 'Chat Owner',
        sdt: '0988000222',
        email: 'chatowner@example.com',
        cccd_passport: 'CHATOWNER001',
        password: 'Customer123!',
      });
      const ownerToken = owner.token;
      const sendResult = await api.post('/api/chat/messages', { noi_dung: 'Hội thoại riêng' }, ownerToken);
      const ownedConversationId = sendResult.body.data.conversation.id;

      const ownResult = await api.get(`/api/chat/conversations/${ownedConversationId}/messages`, ownerToken);
      expect(ownResult.status).toBe(200);

      const stranger = await auth.registerVerifiedCustomer({
        ho_ten: 'Chat Stranger',
        sdt: '0988000333',
        email: 'chatstranger@example.com',
        cccd_passport: 'CHATSTRANGER001',
        password: 'Customer123!',
      });
      const strangerToken = stranger.token;
      const forbiddenResult = await api.get(`/api/chat/conversations/${ownedConversationId}/messages`, strangerToken);
      expect(forbiddenResult.status).toBe(403);
    });
  });

  describe('FR-47: Unread count', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('returns correct unread count', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/chat/conversations/unread', token);
      expect(r.status).toBe(200);
      expect(r.body.data).toBeDefined();
      expect(r.body.data.total).toBeDefined();
      expect(Number(r.body.data.total)).toBeGreaterThanOrEqual(1);
    });
  });

  describe('FR-47: Mark messages as read', () => {
    beforeAll(async () => { await resetDatabase(); });

    let conversationId;

    beforeAll(async () => {
      const { token } = await auth.loginAsLeTan();
      const listRes = await api.get('/api/chat/conversations', token);
      conversationId = listRes.body.data[0]?.id;
    });

    test('messages marked as read', async () => {
      const { token } = await auth.loginAsLeTan();
      expect(conversationId).toBeDefined();
      const r = await api.post(`/api/chat/conversations/${conversationId}/mark-read`, {}, token);
      expect(r.status).toBe(200);
    });

    test('customer cannot mark another customer conversation as read', async () => {
      const stranger = await auth.registerVerifiedCustomer({
        ho_ten: 'Read Stranger',
        sdt: '0988000444',
        email: 'readstranger@example.com',
        cccd_passport: 'READSTRANGER001',
        password: 'Customer123!',
      });
      const strangerToken = stranger.token;
      const r = await api.post(`/api/chat/conversations/${conversationId}/mark-read`, {}, strangerToken);
      expect(r.status).toBe(403);
    });
  });
});
