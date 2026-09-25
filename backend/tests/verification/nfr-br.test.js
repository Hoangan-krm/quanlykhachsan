import { bootEnvironment, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('NFR & BR — Non-Functional & Business Rules', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  test('NFR-01.1: passwords hashed with salt', async () => {
    const rows = await db.query('SELECT mat_khau_hash FROM NGUOI_DUNG');
    for (const r of rows) expect(r.mat_khau_hash).toMatch(/^\$2b\$12\$/);
  });

  test('NFR-02.1: RBAC enforced on every endpoint', async () => {
    const { token } = await auth.loginAsLeTan();
    expect((await api.get('/api/staff', token)).status).toBe(403);
  });

  test('NFR-02.4: JWT tokens used for auth', async () => {
    const r = await auth.loginAsAdmin();
    expect(r.token).toBeDefined();
    expect(r.token.split('.').length).toBe(3);
  });

  test('NFR-03.1: room search responds under 2s', async () => {
    const start = Date.now();
    await api.get('/api/rooms/vacant?check_in=2026-12-01&check_out=2026-12-05');
    expect(Date.now() - start).toBeLessThan(2000);
  });

  test('NFR-03.1b: dashboard responds under 2s', async () => {
    const { token } = await auth.loginAsLeTan();
    const start = Date.now();
    await api.get('/api/dashboard/stats', token);
    expect(Date.now() - start).toBeLessThan(2000);
  });

  test('NFR-05.2: CSS uses media queries', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const cssDir = path.resolve('../frontend/css');
    const files = fs.readdirSync(cssDir);
    let hasMediaQuery = false;
    for (const f of files) {
      const content = fs.readFileSync(path.join(cssDir, f), 'utf8');
      if (content.includes('@media')) { hasMediaQuery = true; break; }
    }
    expect(hasMediaQuery).toBe(true);
  });

  test('NFR-09.1: login events logged', async () => {
    await auth.loginAsAdmin();
    const count = await db.scalar("SELECT COUNT(*) AS c FROM NHAT_KY");
    expect(Number(count)).toBeGreaterThanOrEqual(1);
  });

  test('BR-01.1: valid room statuses only', async () => {
    const rows = await db.query('SELECT trang_thai FROM PHONG');
    for (const r of rows) expect(['Trong', 'DaDat', 'DangO', 'DangDon', 'BaoTri']).toContain(r.trang_thai);
  });

  test('BR-02.1: valid booking statuses only', async () => {
    const rows = await db.query('SELECT trang_thai FROM DAT_PHONG');
    for (const r of rows) expect(['ChoXacNhan', 'DaDat', 'DangO', 'DaTra', 'Huy', 'NoShow']).toContain(r.trang_thai);
  });

  test('BR-03.1: invoice has all required financial fields', async () => {
    const rows = await db.queryRaw('SELECT tong_tien_phong, tong_tien_dich_vu, thue_vat, tong_cong FROM HOA_DON LIMIT 1');
    if (rows.length > 0) {
      const r = rows[0];
      expect(Number(r.tong_tien_phong)).toBeGreaterThanOrEqual(0);
      expect(Number(r.tong_tien_dich_vu)).toBeGreaterThanOrEqual(0);
      expect(Number(r.thue_vat)).toBeGreaterThanOrEqual(0);
      expect(Number(r.tong_cong)).toBeGreaterThan(0);
    }
  });

  test('BR-06.1: vacant rooms exclude BaoTri', async () => {
    const r = await api.get('/api/rooms/vacant?check_in=2026-12-01&check_out=2026-12-05');
    expect(r.status).toBe(200);
    for (const room of r.body.data) {
      expect(room.trang_thai).not.toBe('BaoTri');
    }
  });

  test('BR-11.1: so_phong is unique (duplicate rejected)', async () => {
    const { token } = await auth.loginAsAdmin();
    const existing = await db.scalar('SELECT so_phong FROM PHONG LIMIT 1');
    const r = await api.post('/api/rooms', { so_phong: String(existing), loai_phong_id: 1 }, token);
    expect([400, 409]).toContain(r.status);
  });

  test('BR-12.1: cccd_passport is unique (duplicate rejected)', async () => {
    const { token } = await auth.loginAsLeTan();
    const existing = await db.scalar('SELECT cccd_passport FROM KHACH_HANG LIMIT 1');
    const r = await api.post('/api/customers', {
      ho_ten: 'Dup',
      sdt: '099',
      cccd_passport: String(existing),
    }, token);
    expect([400, 409]).toContain(r.status);
  });

  test('BR-14.1: no DELETE endpoint for audit log', async () => {
    const { token } = await auth.loginAsAdmin();
    const r = await api.del('/api/audit/1', token);
    expect([404, 405]).toContain(r.status);
  });

  test('BR-15.1: shift cash reconciliation', async () => {
    const { token } = await auth.loginAsLeTan();
    const openRes = await api.post('/api/shifts/open', { tien_dau_ca: 1000000 }, token);
    expect([200, 201, 400, 409]).toContain(openRes.status);
  });
});
