import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('BR-16 — Concurrent Booking Race Condition', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('BR-16: Two concurrent bookings for same room with overlapping dates', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('only one succeeds (201), other gets 409', async () => {
      const { token } = await auth.loginAsLeTan();
      const vacantRoom = await db.scalar("SELECT id FROM PHONG WHERE trang_thai = 'Trong' AND id NOT IN (SELECT phong_id FROM DAT_PHONG WHERE trang_thai IN ('ChoXacNhan','DaDat','DangO')) LIMIT 1");
      expect(vacantRoom).toBeDefined();

      const customerId = await db.scalar('SELECT id FROM KHACH_HANG LIMIT 1');
      const bookingData = {
        khach_hang_id: Number(customerId),
        phong_id: Number(vacantRoom),
        ngay_check_in: '2026-12-01',
        ngay_check_out: '2026-12-03',
        so_khach: 2,
      };

      const [res1, res2] = await Promise.all([
        api.post('/api/bookings', bookingData, token),
        api.post('/api/bookings', bookingData, token),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      const overlapCount = await db.scalar(
        `SELECT COUNT(*) AS c FROM DAT_PHONG WHERE phong_id = ? AND trang_thai IN ('ChoXacNhan','DaDat','DangO') AND ngay_check_in = '2026-12-01' AND ngay_check_out = '2026-12-03'`,
        [Number(vacantRoom)]
      );
      expect(Number(overlapCount)).toBe(1);
    });
  });

  describe('BR-16: Sequential bookings for same room with non-overlapping dates', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('both succeed (201)', async () => {
      const { token } = await auth.loginAsLeTan();
      const vacantRoom = await db.scalar("SELECT id FROM PHONG WHERE trang_thai = 'Trong' AND id NOT IN (SELECT phong_id FROM DAT_PHONG WHERE trang_thai IN ('ChoXacNhan','DaDat','DangO')) LIMIT 1");
      expect(vacantRoom).toBeDefined();

      const customerId = await db.scalar('SELECT id FROM KHACH_HANG LIMIT 1');

      const res1 = await api.post('/api/bookings', {
        khach_hang_id: Number(customerId),
        phong_id: Number(vacantRoom),
        ngay_check_in: '2026-12-01',
        ngay_check_out: '2026-12-03',
        so_khach: 2,
      }, token);
      expect(res1.status).toBe(201);

      const res2 = await api.post('/api/bookings', {
        khach_hang_id: Number(customerId),
        phong_id: Number(vacantRoom),
        ngay_check_in: '2026-12-05',
        ngay_check_out: '2026-12-07',
        so_khach: 2,
      }, token);
      expect(res2.status).toBe(201);
    });
  });
});
