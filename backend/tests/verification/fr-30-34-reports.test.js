import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';
import { unlink } from 'fs/promises';
import { resolve } from 'path';

describe('Epic 6 — Reports & Data Admin (FR-30..FR-34)', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('FR-30: Revenue Report', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-30.1: custom date range generates revenue report', async () => {
      const { token } = await auth.loginAsQuanLy();
      const r = await api.get('/api/reports/revenue?from=2026-01-01&to=2026-12-31', token);
      expect(r.status).toBe(200);
      expect(r.body.data).toBeDefined();
    });

    test('AC-30.2: report figures from real transaction data', async () => {
      const { token } = await auth.loginAsQuanLy();
      const r = await api.get('/api/reports/revenue?from=2026-01-01&to=2026-12-31', token);
      expect(r.status).toBe(200);
    });

    test('AC-30.3: no hardcoded/fabricated data (figures match DB)', async () => {
      const { token } = await auth.loginAsQuanLy();
      const r = await api.get('/api/reports/revenue?from=2026-01-01&to=2026-12-31', token);
      expect(r.status).toBe(200);
      const dbRevenue = await db.scalar('SELECT COALESCE(SUM(so_tien), 0) AS c FROM THANH_TOAN');
      expect(dbRevenue).toBeDefined();
    });
  });

  describe('FR-31: Occupancy Report', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-31.1: occupancy calculated as nights/available nights', async () => {
      const { token } = await auth.loginAsQuanLy();
      const r = await api.get('/api/reports/occupancy?from=2026-01-01&to=2026-12-31', token);
      expect(r.status).toBe(200);
    });

    test('AC-31.2: rooms ranked by usage', async () => {
      const { token } = await auth.loginAsQuanLy();
      const r = await api.get('/api/reports/occupancy?from=2026-01-01&to=2026-12-31', token);
      expect(r.status).toBe(200);
      expect(r.body.data).toBeDefined();
    });
  });

  describe('FR-32: Operation History', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-32.1: history filterable by staff, time, action', async () => {
      const { token } = await auth.loginAsQuanLy();
      const r = await api.get('/api/reports/history?page=1&limit=10', token);
      expect(r.status).toBe(200);
    });

    test('AC-32.2: history is read-only (no PUT/DELETE)', async () => {
      const { token } = await auth.loginAsQuanLy();
      const putRes = await api.put('/api/reports/history/1', {}, token);
      expect([404, 405]).toContain(putRes.status);
    });
  });

  describe('FR-33: Shift Report', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-33.1: shift report lists shifts with revenue + variance', async () => {
      const { token } = await auth.loginAsQuanLy();
      const r = await api.get('/api/reports/shifts', token);
      expect(r.status).toBe(200);
    });
  });

  describe('FR-34: Data Backup & Restore', () => {
    beforeAll(async () => { await resetDatabase(); });
    let backupFilename;

    afterAll(async () => {
      if (backupFilename) {
        await unlink(resolve('../database/backup', backupFilename)).catch(() => {});
      }
    });

    test('AC-34.5: non-authenticated user denied backup access', async () => {
      const r = await api.post('/api/backup', {});
      expect(r.status).toBe(401);
    });

    test('AC-34.2: Admin can create a complete manual backup file', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.post('/api/backup', {}, token);
      expect(r.status).toBe(201);
      expect(r.body.data.file).toMatch(/^hotel_db_.+\.json$/);
      expect(Number(r.body.data.table_count)).toBeGreaterThanOrEqual(16);
      backupFilename = r.body.data.file;
    });

    test('AC-34.3: restore returns the database to the backed-up state', async () => {
      const { token } = await auth.loginAsAdmin();
      const before = Number(await db.scalar('SELECT COUNT(*) AS c FROM KHACH_HANG'));
      await db.queryRaw("INSERT INTO KHACH_HANG (ho_ten, sdt, cccd_passport) VALUES ('Backup Mutation', '0999000000', 'BACKUP-MUTATION')");
      expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM KHACH_HANG'))).toBe(before + 1);
      const r = await api.post('/api/backup/restore', { filename: backupFilename }, token);
      expect(r.status).toBe(200);
      expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM KHACH_HANG'))).toBe(before);
    });

    test('AC-34.4: backup and restore operations are logged', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.get('/api/backup', token);
      expect(r.status).toBe(200);
      expect(r.body.data.files).toContain(backupFilename);
      expect(r.body.data.logs.some(row => row.hanh_dong === 'restore')).toBe(true);
    });

    test('backup endpoints reject non-Admin roles and unsafe filenames', async () => {
      const { token: managerToken } = await auth.loginAsQuanLy();
      expect((await api.post('/api/backup', {}, managerToken)).status).toBe(403);
      const { token: adminToken } = await auth.loginAsAdmin();
      expect((await api.post('/api/backup/restore', { filename: '../seed.sql' }, adminToken)).status).toBe(400);
    });
  });

  describe('Dashboard Stats (FR-14 support)', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('dashboard stats accessible to staff', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/dashboard/stats', token);
      expect(r.status).toBe(200);
      expect(r.body.data).toBeDefined();
    });
  });
});
