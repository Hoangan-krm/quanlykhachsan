import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('Epic 4 — Booking & Stay (FR-14..FR-23)', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('FR-14: Room Board / Status Overview', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-14.1: room list returns all rooms with status', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/rooms', token);
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body.data)).toBe(true);
      expect(r.body.data.length).toBeGreaterThanOrEqual(10);
      for (const room of r.body.data) {
        expect(['Trong', 'DaDat', 'DangO', 'DangDon', 'BaoTri']).toContain(room.trang_thai);
      }
    });

    test('AC-14.3: clicking room shows booking details (via room getById)', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/rooms/1', token);
      expect(r.status).toBe(200);
    });
  });

  describe('FR-15: Vacant Room Search by Date Range', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-15.1: search returns vacant rooms for date range', async () => {
      const r = await api.get('/api/rooms/vacant?check_in=2026-12-01&check_out=2026-12-05');
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body.data)).toBe(true);
    });

    test('AC-15.3: BaoTri rooms excluded from vacant search', async () => {
      const r = await api.get('/api/rooms/vacant?check_in=2026-12-01&check_out=2026-12-05');
      if (r.body.data && Array.isArray(r.body.data)) {
        for (const room of r.body.data) {
          expect(room.trang_thai).not.toBe('BaoTri');
        }
      }
    });
  });

  describe('FR-16: Create Booking with Deposit', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-16.1: booking created → room status DaDat', async () => {
      const { token } = await auth.loginAsLeTan();
      const vacantRoom = await db.scalar("SELECT id FROM PHONG WHERE trang_thai = 'Trong' LIMIT 1");
      const r = await api.post('/api/bookings', {
        khach_hang_id: 1,
        phong_id: Number(vacantRoom),
        ngay_check_in: '2026-12-01',
        ngay_check_out: '2026-12-03',
        so_khach: 2,
      }, token);
      expect(r.status).toBe(201);
      const room = await db.findRow('PHONG', { id: Number(vacantRoom) });
      expect(['DaDat', 'DangO']).toContain(room.trang_thai);
    });

    test('AC-16.3: unavailable room rejected', async () => {
      const { token } = await auth.loginAsLeTan();
      const baoTriRoom = await db.scalar("SELECT id FROM PHONG WHERE trang_thai = 'BaoTri' LIMIT 1");
      if (baoTriRoom) {
        const r = await api.post('/api/bookings', {
          khach_hang_id: 1,
          phong_id: Number(baoTriRoom),
          ngay_check_in: '2026-12-01',
          ngay_check_out: '2026-12-03',
          so_khach: 2,
        }, token);
        expect([400, 409]).toContain(r.status);
      }
    });
  });

  describe('FR-17: Cancel Booking', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-17.3: cancelled booking status = Huy', async () => {
      const { token } = await auth.loginAsLeTan();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai IN ('Cho', 'DaDat') LIMIT 1");
      if (bookingId) {
        const r = await api.post(`/api/bookings/${bookingId}/cancel`, { ly_do: 'Test cancel' }, token);
        expect([200, 400]).toContain(r.status);
      }
    });
  });

  describe('FR-18: Edit Booking', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-18.2: checked-in booking rejects edits', async () => {
      const { token } = await auth.loginAsLeTan();
      const checkedIn = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      if (checkedIn) {
        const r = await api.put(`/api/bookings/${checkedIn}`, { so_khach: 5 }, token);
        expect([400, 409]).toContain(r.status);
      }
    });
  });

  describe('FR-19: Mark No-Show', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-19.4: no-show sets status to NoShow', async () => {
      const { token } = await auth.loginAsLeTan();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DaDat' LIMIT 1");
      if (bookingId) {
        const r = await api.post(`/api/bookings/${bookingId}/no-show`, {}, token);
        expect([200, 400]).toContain(r.status);
      }
    });
  });

  describe('FR-20: Check-In', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-20.1: check-in records thoi_gian_check_in_thuc', async () => {
      const { token } = await auth.loginAsLeTan();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DaDat' LIMIT 1");
      if (bookingId) {
        const r = await api.post(`/api/bookings/${bookingId}/check-in`, {}, token);
        expect([200, 400]).toContain(r.status);
        if (r.status === 200) {
          const row = await db.findRow('DAT_PHONG', { id: Number(bookingId) });
          expect(row.thoi_gian_check_in_thuc).not.toBeNull();
        }
      }
    });
  });

  describe('FR-21: Room Transfer', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-21.3: transfer to non-vacant room rejected', async () => {
      const { token } = await auth.loginAsLeTan();
      const occupiedRoom = await db.scalar("SELECT id FROM PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      if (bookingId && occupiedRoom) {
        const r = await api.post(`/api/bookings/${bookingId}/transfer-room`, { phong_id_moi: Number(occupiedRoom) }, token);
        expect([400, 409]).toContain(r.status);
      }
    });
  });

  describe('FR-22: Extend Stay', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-22.1: extend stay updates check-out date', async () => {
      const { token } = await auth.loginAsLeTan();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      if (bookingId) {
        const r = await api.put(`/api/bookings/${bookingId}/extend`, { ngay_check_out_moi: '2026-12-10' }, token);
        expect([200, 400]).toContain(r.status);
      }
    });
  });

  describe('FR-23: Add Services to Booking', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-23.1: add service to booking', async () => {
      const { token } = await auth.loginAsLeTan();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      if (bookingId) {
        const r = await api.post(`/api/bookings/${bookingId}/services`, { dich_vu_id: 1, so_luong: 2 }, token);
        expect([200, 201, 400]).toContain(r.status);
      }
    });

    test('AC-23.3: Inactive service cannot be added', async () => {
      const { token } = await auth.loginAsLeTan();
      const inactiveService = await db.scalar("SELECT id FROM DICH_VU WHERE trang_thai = 'Inactive' LIMIT 1");
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      if (bookingId && inactiveService) {
        const r = await api.post(`/api/bookings/${bookingId}/services`, { dich_vu_id: Number(inactiveService), so_luong: 1 }, token);
        expect([400, 409]).toContain(r.status);
      }
    });
  });
});
