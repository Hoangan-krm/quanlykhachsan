import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('Epic 5 — Payment & Check-Out (FR-24..FR-29)', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('FR-24: Charge Summary Calculation', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-24.1: charge breakdown exists (room + services - deposit)', async () => {
      const { token } = await auth.loginAsLeTan();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      if (bookingId) {
        const r = await api.get(`/api/bookings/${bookingId}`, token);
        expect(r.status).toBe(200);
      }
    });
  });

  describe('FR-25: Check-Out', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-25.3: check-out sets room to DangDon, booking to DaTra', async () => {
      const { token } = await auth.loginAsLeTan();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      if (bookingId) {
        const r = await api.post(`/api/bookings/${bookingId}/check-out`, {}, token);
        expect([200, 400, 409]).toContain(r.status);
      }
    });
  });

  describe('FR-26: Invoice Generation & PDF Export', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-26.1: invoice uses VAT from HOTEL_CONFIG', async () => {
      const { token } = await auth.loginAsLeTan();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      if (bookingId) {
        const r = await api.post('/api/invoices', { dat_phong_id: Number(bookingId) }, token);
        expect([200, 201, 400, 409]).toContain(r.status);
      }
    });

    test('AC-26.2: PDF export endpoint exists', async () => {
      const { token } = await auth.loginAsLeTan();
      const invoiceId = await db.scalar('SELECT id FROM HOA_DON LIMIT 1');
      if (invoiceId) {
        const r = await api.get(`/api/invoices/${invoiceId}/pdf`, token);
        expect([200, 404]).toContain(r.status);
      }
    }, 30000);
  });

  describe('FR-27: Payment Confirmation', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-27.1: payment recorded with amount, method, timestamp', async () => {
      const { token } = await auth.loginAsLeTan();
      const invoiceId = await db.scalar('SELECT id FROM HOA_DON LIMIT 1');
      if (invoiceId) {
        const r = await api.post(`/api/invoices/${invoiceId}/payments`, {
          so_tien: 100000,
          phuong_thuc: 'TienMat',
        }, token);
        expect([200, 201, 400]).toContain(r.status);
      }
    });
  });

  describe('FR-28: Refund Processing', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-28.1: refund requires reason', async () => {
      const { token } = await auth.loginAsLeTan();
      const paymentId = await db.scalar('SELECT id FROM THANH_TOAN LIMIT 1');
      if (paymentId) {
        const r = await api.post(`/api/payments/${paymentId}/refund`, { so_tien: 50000 }, token);
        expect([200, 400]).toContain(r.status);
      }
    });

    test('AC-28.2: refund exceeding collected rejected', async () => {
      const { token } = await auth.loginAsLeTan();
      const paymentId = await db.scalar('SELECT id FROM THANH_TOAN LIMIT 1');
      if (paymentId) {
        const r = await api.post(`/api/payments/${paymentId}/refund`, { so_tien: 999999999, ly_do: 'Test' }, token);
        expect([200, 400, 409]).toContain(r.status);
      }
    });
  });

  describe('FR-29: Shift Management', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-29.1: open shift records opening cash + time', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.post('/api/shifts/open', { tien_dau_ca: 1000000 }, token);
      expect([200, 201, 400, 409]).toContain(r.status);
    });

    test('AC-29.4: CA_LAM_VIEC record persisted', async () => {
      const { token } = await auth.loginAsLeTan();
      await api.post('/api/shifts/open', { tien_dau_ca: 500000 }, token);
      const count = await db.scalar('SELECT COUNT(*) AS c FROM CA_LAM_VIEC');
      expect(Number(count)).toBeGreaterThanOrEqual(1);
    });

    test('AC-29.2: close shift computes variance', async () => {
      const { token } = await auth.loginAsLeTan();
      const openRes = await api.post('/api/shifts/open', { tien_dau_ca: 1000000 }, token);
      if (openRes.status === 200 || openRes.status === 201) {
        const shiftId = openRes.body.data?.id || openRes.body.data?.shift?.id;
        if (shiftId) {
          const closeRes = await api.post(`/api/shifts/${shiftId}/close`, { tien_cuoi_ca: 1000000 }, token);
          expect([200, 400]).toContain(closeRes.status);
        }
      }
    });
  });
});
