import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('Epic 1 — Auth & Staff (FR-01..FR-05)', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('FR-01: Staff Login with Lockout', () => {
    test('AC-01.1: valid login authenticates, resets so_lan_sai to 0, returns JWT', async () => {
      await db.queryRaw("UPDATE NGUOI_DUNG SET so_lan_sai = 3 WHERE email = 'admin@hoangan.vn'");
      const r = await auth.loginAsAdmin();
      expect(r.status).toBe(200);
      expect(r.token).toBeDefined();
      expect(r.user.vai_tro).toBe('Admin');
      const soLanSai = await db.scalar("SELECT so_lan_sai FROM NGUOI_DUNG WHERE email = 'admin@hoangan.vn'");
      expect(Number(soLanSai)).toBe(0);
    });

    test('AC-01.2: invalid password increments so_lan_sai and returns error', async () => {
      await resetDatabase();
      const r = await api.post('/api/auth/login', { email: 'admin@hoangan.vn', password: 'WrongPass!' });
      expect(r.status).toBe(401);
      expect(r.body.success).toBe(false);
      const soLanSai = await db.scalar("SELECT so_lan_sai FROM NGUOI_DUNG WHERE email = 'admin@hoangan.vn'");
      expect(Number(soLanSai)).toBe(1);
    });

    test('AC-01.3: so_lan_sai reaches 5 locks the account', async () => {
      await resetDatabase();
      for (let i = 0; i < 5; i++) {
        await api.post('/api/auth/login', { email: 'letan01@hoangan.vn', password: 'WrongPass!' });
      }
      const trangThai = await db.scalar("SELECT trang_thai FROM NGUOI_DUNG WHERE email = 'letan01@hoangan.vn'");
      expect(String(trangThai)).toBe('Locked');
    });

    test('AC-01.4: locked account rejects login even with correct password', async () => {
      const r = await api.post('/api/auth/login', { email: 'letan01@hoangan.vn', password: 'letan123' });
      expect(r.status).toBe(401);
      expect(r.body.error).toBeDefined();
    });

    test('AC-01.6: customer account rejected from staff login endpoint (/api/auth/login)', async () => {
      await resetDatabase();
      // Customer accounts live in KHACH_HANG, not NGUOI_DUNG. The staff login
      // endpoint queries NGUOI_DUNG, so a customer email must be rejected.
      const r = await api.post('/api/auth/login', { email: 'an.nguyen@email.com', password: 'khach123' });
      expect(r.status).toBe(401);
      expect(r.body.success).toBe(false);
      expect(r.body.data?.token).toBeUndefined();
    });

    test('AC-01.5: no demo credentials pre-filled in login form (static check)', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const loginHtml = fs.readFileSync(path.resolve('../frontend', 'index.html'), 'utf8');
      expect(loginHtml).not.toMatch(/value="admin@hoangan\.vn"/i);
      expect(loginHtml).not.toMatch(/value="admin123"/i);
    });
  });

  describe('FR-02: Staff Account Management', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-02.1: Admin creates staff → stored with hashed password + role', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.post('/api/staff', {
        ho_ten: 'Test Nhan Vien',
        email: 'teststaff@hoangan.vn',
        password: 'TestStaff123!',
        vai_tro: 'LeTan',
      }, token);
      expect(r.status).toBe(201);
      const row = await db.findRow('NGUOI_DUNG', { email: 'teststaff@hoangan.vn' });
      expect(row).not.toBeNull();
      expect(row.mat_khau_hash).toMatch(/^\$2b\$/);
      expect(row.vai_tro).toBe('LeTan');
    });

    test('AC-02.2: Admin edits staff → updates persisted', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.put('/api/staff/2', { ho_ten: 'Updated Quan Ly' }, token);
      expect(r.status).toBe(200);
      const row = await db.findRow('NGUOI_DUNG', { id: 2 });
      expect(row.ho_ten).toBe('Updated Quan Ly');
    });

    test('AC-02.4: locked staff cannot login', async () => {
      const { token } = await auth.loginAsAdmin();
      const lockRes = await api.patch('/api/staff/3/lock', {}, token);
      expect(lockRes.status).toBe(200);
      const loginRes = await api.post('/api/auth/login', { email: 'letan01@hoangan.vn', password: 'letan123' });
      expect(loginRes.status).toBe(401);
    });

    test('AC-02.5: non-Admin (LeTan) denied staff management', async () => {
      await resetDatabase();
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/staff', token);
      expect(r.status).toBe(403);
    });

    test('AC-02.5b: QuanLy also denied staff management (Admin-only)', async () => {
      const { token } = await auth.loginAsQuanLy();
      const r = await api.get('/api/staff', token);
      expect(r.status).toBe(403);
    });
  });

  describe('FR-03: Role-Based Access Control', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-03.2: service-layer enforces authorization — LeTan cannot access staff list', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/staff', token);
      expect(r.status).toBe(403);
    });

    test('AC-03.3: LeTan cannot access revenue report (AdminOrQuanLy)', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/reports/revenue', token);
      expect(r.status).toBe(403);
    });

    test('AC-03.3b: QuanLy cannot create rooms (Admin-only)', async () => {
      const { token } = await auth.loginAsQuanLy();
      const r = await api.post('/api/rooms', { so_phong: 999, loai_phong_id: 1 }, token);
      expect(r.status).toBe(403);
    });

    test('AC-03.3c: no token → 401 for protected endpoints', async () => {
      const r = await api.get('/api/bookings');
      expect(r.status).toBe(401);
    });

    test('AC-03.3d: Admin can access all staff endpoints', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.get('/api/staff', token);
      expect(r.status).toBe(200);
    });
  });

  describe('FR-04: Password Change & Recovery', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-04.1: password change requires current password', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.post('/api/auth/change-password', {
        currentPassword: 'WrongCurrent!',
        newPassword: 'NewPass123!',
      }, token);
      expect([400, 401]).toContain(r.status);
    });

    test('AC-04.4: wrong current password rejected', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.post('/api/auth/change-password', {
        currentPassword: 'WrongCurrent!',
        newPassword: 'NewPass123!',
      }, token);
      expect([400, 401]).toContain(r.status);
      expect(r.body.success).toBe(false);
    });

    test('AC-04.1b: correct current password accepts change', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.post('/api/auth/change-password', {
        currentPassword: 'admin123',
        newPassword: 'NewAdmin123!',
      }, token);
      expect(r.status).toBe(200);
      const loginNew = await api.post('/api/auth/login', { email: 'admin@hoangan.vn', password: 'NewAdmin123!' });
      expect(loginNew.status).toBe(200);
    });

    test('AC-04.2: forgot-password endpoint accepts email', async () => {
      const r = await api.post('/api/auth/forgot-password', { email: 'admin@hoangan.vn' });
      expect([200, 202]).toContain(r.status);
    });

    test('AC-04.3: weak password rejected by validation', async () => {
      await resetDatabase();
      const { token } = await auth.loginAsAdmin();
      const r = await api.post('/api/auth/change-password', {
        currentPassword: 'admin123',
        newPassword: 'weak',
      }, token);
      expect(r.status).toBe(400);
    });
  });

  describe('FR-05: Audit Logging', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-05.1: login action recorded in NHAT_KY', async () => {
      await auth.loginAsAdmin();
      const count = await db.scalar("SELECT COUNT(*) AS c FROM NHAT_KY WHERE hanh_dong = 'login' OR hanh_dong LIKE '%login%'");
      expect(Number(count)).toBeGreaterThanOrEqual(1);
    });

    test('AC-05.2: Admin can view audit log', async () => {
      await auth.loginAsAdmin();
      const { token } = await auth.loginAsAdmin();
      const r = await api.get('/api/audit', token);
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body.data)).toBe(true);
    });

    test('AC-05.2b: audit log supports filtering', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.get('/api/audit?page=1&limit=10', token);
      expect(r.status).toBe(200);
    });

    test('AC-05.3: audit log has no DELETE endpoint', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.del('/api/audit/1', token);
      expect([404, 405]).toContain(r.status);
    });
  });
});
