import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('FR-48 — Guest Booking Lookup (No JWT)', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('FR-48: Guest lookup with valid credentials', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('valid booking code + phone → 200 with booking details', async () => {
      const bookingId = await db.scalar('SELECT id FROM DAT_PHONG LIMIT 1');
      const phone = await db.scalar('SELECT kh.sdt FROM DAT_PHONG dp JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id WHERE dp.id = ?', [Number(bookingId)]);

      const r = await api.post('/api/bookings/guest/lookup', {
        booking_code: String(bookingId),
        sdt_or_email: String(phone),
      });
      expect(r.status).toBe(200);
      expect(r.body.data).toBeDefined();
      expect(r.body.data.id).toBe(Number(bookingId));
      expect(r.body.data.so_phong).toBeDefined();
      expect(r.body.data.ho_ten).toBeDefined();
    });

    test('valid booking code + email → 200 with booking details', async () => {
      const bookingId = await db.scalar('SELECT id FROM DAT_PHONG LIMIT 1');
      const email = await db.scalar('SELECT kh.email FROM DAT_PHONG dp JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id WHERE dp.id = ?', [Number(bookingId)]);

      const r = await api.post('/api/bookings/guest/lookup', {
        booking_code: String(bookingId),
        sdt_or_email: String(email),
      });
      expect(r.status).toBe(200);
      expect(r.body.data).toBeDefined();
    });
  });

  describe('FR-48: Guest lookup with invalid credentials', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('invalid booking code → 404', async () => {
      const r = await api.post('/api/bookings/guest/lookup', {
        booking_code: '999999',
        sdt_or_email: '0901234567',
      });
      expect(r.status).toBe(404);
    });

    test('valid code + wrong phone → 404 (same generic error)', async () => {
      const bookingId = await db.scalar('SELECT id FROM DAT_PHONG LIMIT 1');
      const r = await api.post('/api/bookings/guest/lookup', {
        booking_code: String(bookingId),
        sdt_or_email: '0000000000',
      });
      expect(r.status).toBe(404);
    });

    test('valid code + wrong email → 404', async () => {
      const bookingId = await db.scalar('SELECT id FROM DAT_PHONG LIMIT 1');
      const r = await api.post('/api/bookings/guest/lookup', {
        booking_code: String(bookingId),
        sdt_or_email: 'wrong@email.com',
      });
      expect(r.status).toBe(404);
    });
  });

  describe('FR-48: Guest lookup validation', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('missing fields → 400', async () => {
      const r = await api.post('/api/bookings/guest/lookup', {});
      expect(r.status).toBe(400);
    });

    test('missing sdt_or_email → 400', async () => {
      const r = await api.post('/api/bookings/guest/lookup', { booking_code: '1' });
      expect(r.status).toBe(400);
    });

    test('missing booking_code → 400', async () => {
      const r = await api.post('/api/bookings/guest/lookup', { sdt_or_email: '0901234567' });
      expect(r.status).toBe(400);
    });
  });

  describe('FR-48: No JWT required (public endpoint)', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('lookup works without any auth token', async () => {
      const bookingId = await db.scalar('SELECT id FROM DAT_PHONG LIMIT 1');
      const phone = await db.scalar('SELECT kh.sdt FROM DAT_PHONG dp JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id WHERE dp.id = ?', [Number(bookingId)]);

      const r = await api.post('/api/bookings/guest/lookup', {
        booking_code: String(bookingId),
        sdt_or_email: String(phone),
      });
      expect(r.status).toBe(200);
    });
  });
});
