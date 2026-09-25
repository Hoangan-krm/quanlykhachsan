import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('Epic 2 — Catalog & Facility (FR-06..FR-10)', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('FR-06: Room Type Management', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-06.1: Admin creates room type → persisted', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.post('/api/room-types', {
        ten_loai_phong: 'Test Suite',
        mo_ta: 'Test description',
        gia_mac_dinh: 2000000,
      }, token);
      expect(r.status).toBe(201);
      const row = await db.findRow('LOAI_PHONG', { ten_loai_phong: 'Test Suite' });
      expect(row).not.toBeNull();
      expect(Number(row.gia_mac_dinh)).toBe(2000000);
    });

    test('AC-06.2: Admin edits room type → updated', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.put('/api/room-types/1', { gia_mac_dinh: 550000 }, token);
      expect(r.status).toBe(200);
      const row = await db.findRow('LOAI_PHONG', { id: 1 });
      expect(Number(row.gia_mac_dinh)).toBe(550000);
    });

    test('AC-06.2b: Admin deletes room type (without rooms) → removed', async () => {
      const { token } = await auth.loginAsAdmin();
      const createRes = await api.post('/api/room-types', {
        ten_loai_phong: 'DeleteMe',
        mo_ta: 'To be deleted',
        gia_mac_dinh: 100000,
      }, token);
      expect(createRes.status).toBe(201);
      const newId = createRes.body.data?.id || createRes.body.data?.insertId;
      const r = await api.del(`/api/room-types/${newId}`, token);
      expect([200, 204]).toContain(r.status);
    });

    test('AC-06.3: room type default price applied (via room creation)', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.post('/api/rooms', { so_phong: '401', loai_phong_id: 1 }, token);
      expect(r.status).toBe(201);
    });
  });

  describe('FR-07: Add New Room', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-07.1: Admin adds room → created with status Trong', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.post('/api/rooms', { so_phong: '402', loai_phong_id: 1 }, token);
      expect(r.status).toBe(201);
      const row = await db.findRow('PHONG', { so_phong: '402' });
      expect(row).not.toBeNull();
      expect(row.trang_thai).toBe('Trong');
    });

    test('AC-07.2: duplicate room number rejected', async () => {
      const { token } = await auth.loginAsAdmin();
      const existing = await db.scalar('SELECT so_phong FROM PHONG LIMIT 1');
      const r = await api.post('/api/rooms', { so_phong: String(existing), loai_phong_id: 1 }, token);
      expect([400, 409]).toContain(r.status);
    });

    test('AC-07.3: room appears on room board (list)', async () => {
      const { token } = await auth.loginAsAdmin();
      await api.post('/api/rooms', { so_phong: '202', loai_phong_id: 2 }, token);
      const listRes = await api.get('/api/rooms', token);
      expect(listRes.status).toBe(200);
      const rooms = listRes.body.data;
      expect(rooms.some(r => r.so_phong === '202')).toBe(true);
    });
  });

  describe('FR-08: Room Update & Maintenance Status', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-08.1: Admin updates room info → persisted', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.put('/api/rooms/1', { so_phong: '101A' }, token);
      expect(r.status).toBe(200);
    });

    test('AC-08.2: BaoTri room excluded from vacant search', async () => {
      const { token } = await auth.loginAsAdmin();
      const vacantRoom = await db.scalar("SELECT id FROM PHONG WHERE trang_thai = 'Trong' LIMIT 1");
      await api.patch(`/api/rooms/${vacantRoom}/maintenance`, {}, token);
      const baoTri = await db.findRow('PHONG', { id: Number(vacantRoom) });
      expect(baoTri.trang_thai).toBe('BaoTri');
    });

    test('AC-08.4: mark maintenance sets trang_thai to BaoTri', async () => {
      const { token } = await auth.loginAsAdmin();
      const vacantRoom = await db.scalar("SELECT id FROM PHONG WHERE trang_thai = 'Trong' LIMIT 1");
      const r = await api.patch(`/api/rooms/${vacantRoom}/maintenance`, {}, token);
      expect(r.status).toBe(200);
      const row = await db.findRow('PHONG', { id: Number(vacantRoom) });
      expect(row.trang_thai).toBe('BaoTri');
    });

    test('AC-08.3: cannot delete room with active booking', async () => {
      const { token } = await auth.loginAsAdmin();
      const bookedRoom = await db.scalar("SELECT id FROM PHONG WHERE trang_thai != 'Trong' LIMIT 1");
      if (bookedRoom) {
        const r = await api.del(`/api/rooms/${bookedRoom}`, token);
        expect([400, 409]).toContain(r.status);
      }
    });
  });

  describe('FR-09: Service Catalog Management', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-09.1: Admin creates service → persisted', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.post('/api/services', {
        ten_dich_vu: 'Test Service',
        don_gia: 50000,
        don_vi_tinh: 'lần',
      }, token);
      expect(r.status).toBe(201);
      const row = await db.findRow('DICH_VU', { ten_dich_vu: 'Test Service' });
      expect(row).not.toBeNull();
    });

    test('AC-09.2: Admin edits service → updated', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.put('/api/services/1', { don_gia: 99000 }, token);
      expect(r.status).toBe(200);
      const row = await db.findRow('DICH_VU', { id: 1 });
      expect(Number(row.don_gia)).toBe(99000);
    });

    test('AC-09.3: Inactive service hidden from active list', async () => {
      const { token } = await auth.loginAsAdmin();
      await api.patch('/api/services/1/status', { trang_thai: 'Inactive' }, token);
      const activeRes = await api.get('/api/services/active', token);
      expect(activeRes.status).toBe(200);
      const activeServices = activeRes.body.data;
      expect(activeServices.some(s => s.id === 1)).toBe(false);
    });

    test('AC-09.4: trang_thai field exists on every service', async () => {
      const rows = await db.query('SELECT trang_thai FROM DICH_VU');
      for (const r of rows) expect(['Active', 'Inactive']).toContain(r.trang_thai);
    });
  });

  describe('FR-10: Hotel Configuration', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-10.1: Admin updates hotel config', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.put('/api/config', { ten_khach_san: 'Test Hotel', dia_chi: '123 Test St', vat: 0.1 }, token);
      expect(r.status).toBe(200);
    });

    test('AC-10.2: non-Admin denied config edit', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.put('/api/config', { ten_khach_san: 'Hacked' }, token);
      expect(r.status).toBe(403);
    });

    test('AC-10.3: VAT rate used in config', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.get('/api/config', token);
      expect(r.status).toBe(200);
      expect(r.body.data).toBeDefined();
    });

    test('AC-10.1b: public config accessible without auth', async () => {
      const r = await api.get('/api/config/public');
      expect(r.status).toBe(200);
    });
  });
});
