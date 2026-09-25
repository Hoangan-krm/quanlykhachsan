import { bootEnvironment, resetDatabase, shutdownEnvironment } from './helpers/env.js';
import * as db from './helpers/db.js';
import * as auth from './helpers/auth.js';
import * as api from './helpers/api.js';

describe('API Integration Tests', () => {
  beforeAll(async () => { await bootEnvironment(); await resetDatabase(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('Auth Endpoints', () => {
    test('POST /api/auth/login with valid credentials should return 200 + token', async () => {
      const res = await auth.loginAsAdmin();
      expect(res.status).toBe(200);
      expect(res.token).toBeDefined();
      expect(res.user).toBeDefined();
      expect(res.user.email).toBe('admin@hoangan.vn');
    });

    test('POST /api/auth/login with invalid credentials should return 401', async () => {
      const res = await auth.loginAs('admin@hoangan.vn', 'wrongpassword');
      expect(res.status).toBe(401);
    });

    test('POST /api/auth/login with non-existent email should return 401', async () => {
      const res = await auth.loginAs('nobody@test.com', 'test');
      expect(res.status).toBe(401);
    });

    test('POST /api/auth/login with missing fields should return 400', async () => {
      const r = await api.post('/api/auth/login', { email: 'admin@hoangan.vn' });
      expect(r.status).toBe(400);
    });

    test('GET /api/auth/me with valid token should return user profile', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/auth/me', token);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('admin@hoangan.vn');
    });

    test('GET /api/auth/me without token should return 401', async () => {
      const res = await api.get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('RBAC Enforcement', () => {
    test('GET /api/staff with Admin role should return 200', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/staff', token);
      expect(res.status).toBe(200);
    });

    test('GET /api/staff with LeTan role should return 403', async () => {
      const { token } = await auth.loginAsLeTan();
      const res = await api.get('/api/staff', token);
      expect(res.status).toBe(403);
    });

    test('GET /api/staff without auth should return 401', async () => {
      const res = await api.get('/api/staff');
      expect(res.status).toBe(401);
    });

    test('GET /api/reports/revenue with LeTan role should return 403', async () => {
      const { token } = await auth.loginAsLeTan();
      const res = await api.get('/api/reports/revenue', token);
      expect(res.status).toBe(403);
    });

    test('GET /api/reports/revenue with Admin role should return 200', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/reports/revenue', token);
      expect(res.status).toBe(200);
    });
  });

  describe('Room Endpoints', () => {
    test('GET /api/rooms should return paginated list', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/rooms', token);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/rooms/:id with valid ID should return room', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/rooms/1', token);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    test('GET /api/rooms/:id with invalid ID should return 404', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/rooms/99999', token);
      expect(res.status).toBe(404);
    });
  });

  describe('Dashboard', () => {
    test('GET /api/dashboard/stats should return real data from DB', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/dashboard/stats', token);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.rooms).toBeDefined();
      expect(typeof res.body.data.rooms.total).toBe('number');
    });
  });

  describe('Booking Endpoints', () => {
    test('GET /api/bookings should return paginated list', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/bookings', token);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/bookings/:id should return booking with services and invoice', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/bookings/3', token);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('Checkout Precondition (BR-06)', () => {
    test('POST /api/bookings/:id/check-out on unpaid booking should return 409', async () => {
      const { token } = await auth.loginAsAdmin();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      expect(bookingId).toBeDefined();
      const res = await api.post(`/api/bookings/${bookingId}/check-out`, {}, token);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CHECKOUT_UNPAID');
    });
  });

  describe('Invoice Endpoints', () => {
    test('GET /api/invoices should return paginated list', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/invoices', token);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/invoices/:id should return invoice detail', async () => {
      const { token } = await auth.loginAsAdmin();
      const invoiceId = await db.scalar('SELECT id FROM HOA_DON LIMIT 1');
      if (invoiceId) {
        const res = await api.get(`/api/invoices/${invoiceId}`, token);
        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
      }
    });
  });

  describe('Audit Log', () => {
    test('GET /api/audit should return audit log entries', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/audit', token);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('GET /api/audit with LeTan role should return 403', async () => {
      const { token } = await auth.loginAsLeTan();
      const res = await api.get('/api/audit', token);
      expect(res.status).toBe(403);
    });
  });
});
