import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('FR-22 — Extend Stay Conflict Check', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('FR-22: Extend stay with no conflict → 200', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('extend stay succeeds when no future booking overlaps', async () => {
      const { token } = await auth.loginAsLeTan();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      expect(bookingId).toBeDefined();

      const booking = await db.findRow('DAT_PHONG', { id: Number(bookingId) });
      await db.queryRaw(
        `DELETE FROM DAT_PHONG WHERE phong_id = ? AND trang_thai IN ('ChoXacNhan','DaDat','DangO') AND ngay_check_in > ? AND id != ?`,
        [booking.phong_id, booking.ngay_check_out, Number(bookingId)]
      );

      const r = await api.put(`/api/bookings/${bookingId}/extend`, {
        ngay_check_out: '2026-09-15',
      }, token);
      expect(r.status).toBe(200);

      const updatedDate = await db.scalar('SELECT ngay_check_out FROM DAT_PHONG WHERE id = ?', [Number(bookingId)]);
      const d = new Date(updatedDate);
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(8);
      expect(d.getDate()).toBe(15);
    });
  });

  describe('FR-22: Extend stay creating conflict → 409 EXTEND_CONFLICT', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('extend stay rejected when future booking overlaps', async () => {
      const { token } = await auth.loginAsLeTan();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      expect(bookingId).toBeDefined();

      const booking = await db.findRow('DAT_PHONG', { id: Number(bookingId) });
      const customerId = await db.scalar('SELECT id FROM KHACH_HANG LIMIT 1');

      await db.queryRaw(
        `INSERT INTO DAT_PHONG (khach_hang_id, phong_id, ngay_check_in, ngay_check_out, tien_coc, trang_thai)
         VALUES (?, ?, '2026-09-14', '2026-09-17', 0, 'DaDat')`,
        [Number(customerId), booking.phong_id]
      );

      const r = await api.put(`/api/bookings/${bookingId}/extend`, {
        ngay_check_out: '2026-09-15',
      }, token);
      expect(r.status).toBe(409);
      expect(r.body.error).toBe('EXTEND_CONFLICT');
    });
  });
});
