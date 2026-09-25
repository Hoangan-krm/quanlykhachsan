import { bootEnvironment, resetDatabase, shutdownEnvironment } from './helpers/env.js';
import * as db from './helpers/db.js';
import * as auth from './helpers/auth.js';
import * as api from './helpers/api.js';

describe('E2E — Hotel Management Tests', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('Complete Hotel Management Flow', () => {
    let createdCustomerId;
    let createdBookingId;
    let createdInvoiceId;
    let adminToken;

    beforeAll(async () => {
      await resetDatabase();
      const r = await auth.loginAsAdmin();
      adminToken = r.token;
    });

    test('Step 1: Login as Admin', async () => {
      expect(adminToken).toBeDefined();
    });

    test('Step 2: Dashboard loads with real data', async () => {
      const res = await api.get('/api/dashboard/stats', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data.rooms.total).toBeGreaterThan(0);
    });

    test('Step 3: Create a new customer', async () => {
      const res = await api.post('/api/customers', {
        ho_ten: 'E2E Test Customer',
        sdt: '0999999999',
        email: 'e2e@test.com',
        cccd_passport: 'E2ETEST123',
        quoc_tich: 'Việt Nam',
      }, adminToken);
      expect(res.status).toBe(201);
      createdCustomerId = res.body.data.id;
      expect(createdCustomerId).toBeDefined();
    });

    test('Step 4: Find a vacant room', async () => {
      const res = await api.get('/api/rooms?trang_thai=Trong', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('Step 5: Create a booking', async () => {
      const roomsRes = await api.get('/api/rooms?trang_thai=Trong', adminToken);
      const room = roomsRes.body.data[0];
      const res = await api.post('/api/bookings', {
        khach_hang_id: createdCustomerId,
        phong_id: room.id,
        ngay_check_in: '2026-10-15',
        ngay_check_out: '2026-10-18',
        tien_coc: 500000,
      }, adminToken);
      expect(res.status).toBe(201);
      createdBookingId = res.body.data.id;
      expect(createdBookingId).toBeDefined();
    });

    test('Step 6: Check-in the booking', async () => {
      const res = await api.post(`/api/bookings/${createdBookingId}/check-in`, {}, adminToken);
      expect(res.status).toBe(200);
    });

    test('Step 7: Add a service to the booking', async () => {
      const svcRes = await api.get('/api/services/active', adminToken);
      expect(svcRes.body.data.length).toBeGreaterThan(0);
      const res = await api.post(`/api/bookings/${createdBookingId}/services`, {
        dich_vu_id: svcRes.body.data[0].id,
        so_luong: 2,
      }, adminToken);
      expect(res.status).toBe(201);
    });

    test('Step 8: Generate invoice', async () => {
      const res = await api.post('/api/invoices', { dat_phong_id: createdBookingId }, adminToken);
      expect(res.status).toBe(201);
      createdInvoiceId = res.body.data.id;
      expect(res.body.data.tong_cong).toBeGreaterThan(0);
    });

    test('Step 9: Attempt checkout before payment — must fail (BR-06)', async () => {
      const res = await api.post(`/api/bookings/${createdBookingId}/check-out`, {}, adminToken);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CHECKOUT_UNPAID');
    });

    test('Step 10: Pay the full invoice', async () => {
      const invRes = await api.get(`/api/invoices/${createdInvoiceId}`, adminToken);
      const total = Number(invRes.body.data.tong_cong);
      const res = await api.post(`/api/invoices/${createdInvoiceId}/payments`, {
        so_tien: total,
        hinh_thuc: 'TienMat',
      }, adminToken);
      expect(res.status).toBe(201);
      expect(res.body.data.invoice_status).toBe('DaThanhToan');
    });

    test('Step 11: Checkout after full payment — must succeed', async () => {
      const res = await api.post(`/api/bookings/${createdBookingId}/check-out`, {}, adminToken);
      expect(res.status).toBe(200);
    });

    test('Step 12: Verify booking status is DaTra', async () => {
      const res = await api.get(`/api/bookings/${createdBookingId}`, adminToken);
      expect(res.body.data.trang_thai).toBe('DaTra');
    });

    test('Step 13: Revenue report returns data', async () => {
      const res = await api.get('/api/reports/revenue?from=2026-10-01&to=2026-10-31', adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('Booking Conflict Detection (BR-03)', () => {
    let adminToken;

    beforeAll(async () => {
      await resetDatabase();
      const r = await auth.loginAsAdmin();
      adminToken = r.token;
    });

    test('Should not allow double booking of same room for overlapping dates', async () => {
      const roomsRes = await api.get('/api/rooms?trang_thai=Trong', adminToken);
      const room = roomsRes.body.data[0];
      const custRes = await api.get('/api/customers?limit=1', adminToken);
      const customer = custRes.body.data[0];

      const booking1 = await api.post('/api/bookings', {
        khach_hang_id: customer.id,
        phong_id: room.id,
        ngay_check_in: '2026-11-01',
        ngay_check_out: '2026-11-05',
        tien_coc: 0,
      }, adminToken);
      expect(booking1.status).toBe(201);

      const booking2 = await api.post('/api/bookings', {
        khach_hang_id: customer.id,
        phong_id: room.id,
        ngay_check_in: '2026-11-03',
        ngay_check_out: '2026-11-07',
        tien_coc: 0,
      }, adminToken);
      expect(booking2.status).toBe(409);
      expect(booking2.body.error).toBe('ROOM_NOT_AVAILABLE');
    });
  });

  describe('Overpayment Prevention (BR-11)', () => {
    let adminToken;

    beforeAll(async () => {
      await resetDatabase();
      const r = await auth.loginAsAdmin();
      adminToken = r.token;
    });

    test('Should reject payment exceeding invoice total', async () => {
      const res = await api.post('/api/invoices/1/payments', {
        so_tien: 999999999,
        hinh_thuc: 'TienMat',
      }, adminToken);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('OVERPAYMENT');
    });
  });

  describe('Role-Based Access Control', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('LeTan cannot access staff management', async () => {
      const { token } = await auth.loginAsLeTan();
      const res = await api.get('/api/staff', token);
      expect(res.status).toBe(403);
    });

    test('LeTan cannot access reports', async () => {
      const { token } = await auth.loginAsLeTan();
      const res = await api.get('/api/reports/revenue', token);
      expect(res.status).toBe(403);
    });

    test('LeTan cannot access audit log', async () => {
      const { token } = await auth.loginAsLeTan();
      const res = await api.get('/api/audit', token);
      expect(res.status).toBe(403);
    });

    test('QuanLy can access reports', async () => {
      const { token } = await auth.loginAsQuanLy();
      const res = await api.get('/api/reports/revenue', token);
      expect(res.status).toBe(200);
    });

    test('Admin can access staff management', async () => {
      const { token } = await auth.loginAsAdmin();
      const res = await api.get('/api/staff', token);
      expect(res.status).toBe(200);
    });
  });
});
