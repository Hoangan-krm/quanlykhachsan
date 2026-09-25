import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';
import * as fx from '../helpers/fixtures.js';

describe('Helpers Smoke Test — Environment + DB + Auth + API', () => {
  afterAll(async () => {
    await db.closePool();
    await shutdownEnvironment();
  });

  test('bootEnvironment starts mysql-memory-server + schema + seed + app', async () => {
    const env = await bootEnvironment();
    expect(env.app).toBeDefined();
    expect(env.port).toBeGreaterThan(0);
    expect(env.host).toBeDefined();
  }, 120000);

  test('db.query executes parameterized SQL', async () => {
    const rows = await db.query('SELECT 1 AS val');
    expect(rows[0].val).toBe(1);
  });

  test('db.scalar returns a single value', async () => {
    const v = await db.scalar('SELECT COUNT(*) AS c FROM NGUOI_DUNG');
    expect(Number(v)).toBeGreaterThanOrEqual(3);
  });

  test('seed data: 3 staff, 5 room types, 10 rooms, 5 customers, 5 services, 6 bookings', async () => {
    expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM NGUOI_DUNG'))).toBe(3);
    expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM LOAI_PHONG'))).toBe(5);
    expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM PHONG'))).toBe(10);
    expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM KHACH_HANG'))).toBe(5);
    expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM DICH_VU'))).toBe(5);
    expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM DAT_PHONG'))).toBe(6);
  });

  test('seed passwords are bcrypt hashes (SEC-01)', async () => {
    const rows = await db.query('SELECT mat_khau_hash FROM NGUOI_DUNG');
    for (const r of rows) expect(r.mat_khau_hash).toMatch(/^\$2b\$/);
  });

  test('seed has BaoTri room, Inactive service, check-in timestamp (SEC-06/07/08)', async () => {
    const baoTri = await db.scalar("SELECT COUNT(*) AS c FROM PHONG WHERE trang_thai='BaoTri'");
    expect(Number(baoTri)).toBeGreaterThanOrEqual(1);
    const inactive = await db.scalar("SELECT COUNT(*) AS c FROM DICH_VU WHERE trang_thai='Inactive'");
    expect(Number(inactive)).toBeGreaterThanOrEqual(1);
    const checkedIn = await db.scalar('SELECT COUNT(*) AS c FROM DAT_PHONG WHERE thoi_gian_check_in_thuc IS NOT NULL');
    expect(Number(checkedIn)).toBeGreaterThanOrEqual(1);
  });

  test('auth.loginAsAdmin returns JWT + user with vai_tro Admin', async () => {
    const r = await auth.loginAsAdmin();
    expect(r.status).toBe(200);
    expect(r.token).toBeDefined();
    expect(r.user.vai_tro).toBe('Admin');
  });

  test('auth.loginAsQuanLy returns JWT + user with vai_tro QuanLy', async () => {
    const r = await auth.loginAsQuanLy();
    expect(r.status).toBe(200);
    expect(r.user.vai_tro).toBe('QuanLy');
  });

  test('auth.loginAsLeTan returns JWT + user with vai_tro LeTan', async () => {
    const r = await auth.loginAsLeTan();
    expect(r.status).toBe(200);
    expect(r.user.vai_tro).toBe('LeTan');
  });

  test('api.get without token to protected endpoint returns 401', async () => {
    const res = await api.get('/api/staff');
    expect(res.status).toBe(401);
  });

  test('api.get with Admin token to /api/staff returns 200', async () => {
    const { token } = await auth.loginAsAdmin();
    const res = await api.get('/api/staff', token);
    expect(res.status).toBe(200);
  });

  test('api.get with LeTan token to /api/staff returns 403 (RBAC)', async () => {
    const { token } = await auth.loginAsLeTan();
    const res = await api.get('/api/staff', token);
    expect(res.status).toBe(403);
  });

  test('fixtures export valid data objects', async () => {
    expect(fx.validCustomer.ho_ten).toBeDefined();
    expect(fx.validCustomer.cccd_passport).toBeDefined();
    expect(fx.validBooking.ngay_check_out).not.toBe(fx.validBooking.ngay_check_in);
    expect(fx.duplicateCustomer.cccd_passport).toBe('001234567890');
    expect(fx.roomStatuses).toContain('BaoTri');
    expect(fx.bookingStatuses).toHaveLength(6);
  });

  test('resetDatabase restores seed state', async () => {
    await db.queryRaw('DELETE FROM KHACH_HANG WHERE cccd_passport = ?', ['TESTCCCD999']);
    const before = await db.scalar('SELECT COUNT(*) AS c FROM KHACH_HANG');
    expect(Number(before)).toBe(5);
    await db.queryRaw('INSERT INTO KHACH_HANG (ho_ten, sdt, cccd_passport) VALUES (?, ?, ?)', ['Temp', '099', 'TESTCCCD999']);
    const afterInsert = await db.scalar('SELECT COUNT(*) AS c FROM KHACH_HANG');
    expect(Number(afterInsert)).toBe(6);
    await resetDatabase();
    const afterReset = await db.scalar('SELECT COUNT(*) AS c FROM KHACH_HANG');
    expect(Number(afterReset)).toBe(5);
  });
});
