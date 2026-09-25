import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('BR-17 & BR-18 — Deletion Guards', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('BR-17: Delete room with active booking → 409', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('ROOM_HAS_ACTIVE_BOOKINGS guard enforced', async () => {
      const { token } = await auth.loginAsAdmin();
      const roomWithBooking = await db.scalar(
        `SELECT p.id FROM PHONG p WHERE EXISTS (SELECT 1 FROM DAT_PHONG dp WHERE dp.phong_id = p.id AND dp.trang_thai IN ('ChoXacNhan','DaDat','DangO')) LIMIT 1`
      );
      expect(roomWithBooking).toBeDefined();

      const r = await api.del(`/api/rooms/${roomWithBooking}`, token);
      expect(r.status).toBe(409);
      expect(r.body.error).toBeDefined();

      const stillExists = await db.findRow('PHONG', { id: Number(roomWithBooking) });
      expect(stillExists).not.toBeNull();
    });
  });

  describe('BR-18: Delete room type with rooms → 409', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('ROOM_TYPE_HAS_ROOMS guard enforced', async () => {
      const { token } = await auth.loginAsAdmin();
      const roomTypeWithRooms = await db.scalar(
        `SELECT id FROM LOAI_PHONG WHERE EXISTS (SELECT 1 FROM PHONG p WHERE p.loai_phong_id = LOAI_PHONG.id) LIMIT 1`
      );
      expect(roomTypeWithRooms).toBeDefined();

      const r = await api.del(`/api/room-types/${roomTypeWithRooms}`, token);
      expect(r.status).toBe(409);
      expect(r.body.error).toBeDefined();

      const stillExists = await db.findRow('LOAI_PHONG', { id: Number(roomTypeWithRooms) });
      expect(stillExists).not.toBeNull();
    });
  });

  describe('BR-17: Delete room with no bookings → 200', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('room with no active bookings can be deleted', async () => {
      const { token } = await auth.loginAsAdmin();
      const roomNoBookings = await db.scalar(
        `SELECT p.id FROM PHONG p WHERE NOT EXISTS (SELECT 1 FROM DAT_PHONG dp WHERE dp.phong_id = p.id AND dp.trang_thai IN ('ChoXacNhan','DaDat','DangO')) LIMIT 1`
      );
      expect(roomNoBookings).toBeDefined();

      const r = await api.del(`/api/rooms/${roomNoBookings}`, token);
      expect([200, 204]).toContain(r.status);

      const gone = await db.findRow('PHONG', { id: Number(roomNoBookings) });
      expect(gone).toBeNull();
    });
  });

  describe('BR-18: Delete room type with no rooms → 200', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('room type with no rooms can be deleted', async () => {
      const { token } = await auth.loginAsAdmin();
      const createRes = await api.post('/api/room-types', {
        ten_loai_phong: 'Test Room Type for Deletion',
        mo_ta: 'Temporary room type',
        gia_mac_dinh: 1000000,
      }, token);
      expect(createRes.status).toBe(201);
      const newTypeId = createRes.body.data.id || createRes.body.data?.id;

      const r = await api.del(`/api/room-types/${newTypeId}`, token);
      expect([200, 204]).toContain(r.status);

      const gone = await db.findRow('LOAI_PHONG', { id: Number(newTypeId) });
      expect(gone).toBeNull();
    });
  });
});
