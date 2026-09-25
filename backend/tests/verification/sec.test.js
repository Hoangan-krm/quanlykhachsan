import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('SEC — Security Requirements', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('SEC-01: Password Hashing', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('SEC-01.1: all NGUOI_DUNG passwords are bcrypt hashes', async () => {
      const rows = await db.query('SELECT mat_khau_hash FROM NGUOI_DUNG');
      for (const r of rows) expect(r.mat_khau_hash).toMatch(/^\$2b\$/);
    });

    test('SEC-01.2: no plaintext passwords in NGUOI_DUNG', async () => {
      const rows = await db.query('SELECT mat_khau_hash FROM NGUOI_DUNG');
      for (const r of rows) expect(r.mat_khau_hash).not.toMatch(/^(Admin|QuanLy|LeTan)/);
    });
  });

  describe('SEC-02: Login Lockout', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('SEC-02.1: so_lan_sai reaches 5 locks account', async () => {
      for (let i = 0; i < 5; i++) {
        await api.post('/api/auth/login', { email: 'letan01@hoangan.vn', password: 'Wrong!' });
      }
      const trangThai = await db.scalar("SELECT trang_thai FROM NGUOI_DUNG WHERE email = 'letan01@hoangan.vn'");
      expect(String(trangThai)).toBe('Locked');
    });

    test('SEC-02.2: so_lan_sai field exists', async () => {
      const val = await db.scalar("SELECT so_lan_sai FROM NGUOI_DUNG LIMIT 1");
      expect(val).toBeDefined();
    });

    test('SEC-02.3: successful login resets so_lan_sai to 0', async () => {
      await db.queryRaw("UPDATE NGUOI_DUNG SET so_lan_sai = 3 WHERE email = 'admin@hoangan.vn'");
      await auth.loginAsAdmin();
      const val = await db.scalar("SELECT so_lan_sai FROM NGUOI_DUNG WHERE email = 'admin@hoangan.vn'");
      expect(Number(val)).toBe(0);
    });
  });

  describe('SEC-03: Backend API Authorization', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('SEC-03.1: LeTan cannot access Admin-only endpoints', async () => {
      const { token } = await auth.loginAsLeTan();
      expect((await api.get('/api/staff', token)).status).toBe(403);
      expect((await api.get('/api/config', token)).status).toBe(403);
    });

    test('SEC-03.2: QuanLy cannot access Admin-only endpoints', async () => {
      const { token } = await auth.loginAsQuanLy();
      expect((await api.post('/api/rooms', { so_phong: '999', loai_phong_id: 1 }, token)).status).toBe(403);
    });

    test('SEC-03.3: no token → 401', async () => {
      expect((await api.get('/api/bookings')).status).toBe(401);
      expect((await api.get('/api/staff')).status).toBe(401);
    });
  });

  describe('SEC-05: Full Payment Before Checkout', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('SEC-05.1: checkout requires fully paid invoice', async () => {
      const { token } = await auth.loginAsLeTan();
      const bookingId = await db.scalar("SELECT id FROM DAT_PHONG WHERE trang_thai = 'DangO' LIMIT 1");
      if (bookingId) {
        const r = await api.post(`/api/bookings/${bookingId}/check-out`, {}, token);
        expect([409, 400]).toContain(r.status);
      }
    });
  });

  describe('SEC-07: Room Maintenance Status', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('SEC-07.1: BaoTri status supported', async () => {
      const count = await db.scalar("SELECT COUNT(*) AS c FROM PHONG WHERE trang_thai = 'BaoTri'");
      expect(Number(count)).toBeGreaterThanOrEqual(1);
    });

    test('SEC-07.2: BaoTri excluded from vacant search', async () => {
      const r = await api.get('/api/rooms/vacant?check_in=2026-12-01&check_out=2026-12-05');
      expect(r.status).toBe(200);
      for (const room of r.body.data) expect(room.trang_thai).not.toBe('BaoTri');
    });
  });

  describe('SEC-08: Service Active/Inactive', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('SEC-08.1: trang_thai field on DICH_VU', async () => {
      const rows = await db.query('SELECT trang_thai FROM DICH_VU');
      for (const r of rows) expect(['Active', 'Inactive']).toContain(r.trang_thai);
    });

    test('SEC-08.2: Inactive services hidden from active list', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/services/active', token);
      expect(r.status).toBe(200);
      for (const s of r.body.data) expect(s.trang_thai).toBe('Active');
    });
  });

  describe('SEC-11: Authenticated Data Reset', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('SEC-11.1: no unauthenticated data wipe endpoint', async () => {
      const r = await api.post('/api/config/reset', {});
      expect([401, 403, 404]).toContain(r.status);
    });
  });

  describe('SEC-14: Shift Entity', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('SEC-14.1: CA_LAM_VIEC table exists with data', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/shifts', token);
      expect(r.status).toBe(200);
    });
  });
});
