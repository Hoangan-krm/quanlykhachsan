import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

function findKey(obj, key) {
  if (obj == null || typeof obj !== 'object') return false;
  if (Array.isArray(obj)) {
    return obj.some(item => findKey(item, key));
  }
  if (key in obj) return true;
  return Object.values(obj).some(v => findKey(v, key));
}

describe('SEC-19 — No Sensitive Data Leakage', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('SEC-19: GET /api/staff → no mat_khau_hash', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('staff list does not leak password hashes', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.get('/api/staff', token);
      expect(r.status).toBe(200);
      expect(findKey(r.body, 'mat_khau_hash')).toBe(false);
    });

    test('staff detail does not leak password hashes', async () => {
      const { token } = await auth.loginAsAdmin();
      const staffId = await db.scalar('SELECT id FROM NGUOI_DUNG LIMIT 1');
      const r = await api.get(`/api/staff/${staffId}`, token);
      expect(r.status).toBe(200);
      expect(findKey(r.body, 'mat_khau_hash')).toBe(false);
    });
  });

  describe('SEC-19: GET /api/customers → no mat_khau_hash', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('customer list does not leak password hashes', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/customers', token);
      expect(r.status).toBe(200);
      expect(findKey(r.body, 'mat_khau_hash')).toBe(false);
    });

    test('customer detail does not leak password hashes', async () => {
      const { token } = await auth.loginAsLeTan();
      const customerId = await db.scalar('SELECT id FROM KHACH_HANG LIMIT 1');
      const r = await api.get(`/api/customers/${customerId}`, token);
      expect(r.status).toBe(200);
      expect(findKey(r.body, 'mat_khau_hash')).toBe(false);
    });
  });

  describe('SEC-19: GET /api/auth/me → no mat_khau_hash', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('auth profile does not leak password hashes', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.get('/api/auth/me', token);
      expect(r.status).toBe(200);
      expect(findKey(r.body, 'mat_khau_hash')).toBe(false);
    });

    test('login response does not leak password hashes', async () => {
      const r = await auth.loginAsAdmin();
      expect(findKey(r.body, 'mat_khau_hash')).toBe(false);
    });
  });
});
