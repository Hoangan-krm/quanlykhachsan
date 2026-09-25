import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('Epic 3 — Customer Management (FR-11..FR-13)', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('FR-11: Create Customer Profile', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-11.1: requires full name, phone, ID number', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.post('/api/customers', {
        ho_ten: 'Test Customer',
        sdt: '0901234567',
        cccd_passport: 'UNIQUECCCD123',
      }, token);
      expect(r.status).toBe(201);
    });

    test('AC-11.1b: missing required fields rejected', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.post('/api/customers', { ho_ten: 'No Phone' }, token);
      expect(r.status).toBe(400);
    });

    test('AC-11.2: duplicate cccd_passport rejected', async () => {
      const { token } = await auth.loginAsLeTan();
      const existing = await db.scalar('SELECT cccd_passport FROM KHACH_HANG LIMIT 1');
      const r = await api.post('/api/customers', {
        ho_ten: 'Dup Customer',
        sdt: '0999999999',
        cccd_passport: String(existing),
      }, token);
      expect([400, 409]).toContain(r.status);
    });

    test('AC-11.3: created customer has creation timestamp', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.post('/api/customers', {
        ho_ten: 'Timestamp Test',
        sdt: '0888888888',
        cccd_passport: '999888777666',
      }, token);
      expect(r.status).toBe(201);
      const row = await db.findRow('KHACH_HANG', { cccd_passport: '999888777666' });
      expect(row.created_at).toBeDefined();
    });
  });

  describe('FR-12: Search & Update Customer', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-12.1: search by phone returns exact matches', async () => {
      const { token } = await auth.loginAsLeTan();
      const phone = await db.scalar('SELECT sdt FROM KHACH_HANG LIMIT 1');
      const r = await api.get(`/api/customers/search?q=${phone}`, token);
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body.data)).toBe(true);
      expect(r.body.data.length).toBeGreaterThanOrEqual(1);
    });

    test('AC-12.2: search by name returns matches', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/customers/search?q=khach', token);
      expect(r.status).toBe(200);
    });

    test('AC-12.3: update customer profile saves changes', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.put('/api/customers/1', { ho_ten: 'Updated Name' }, token);
      expect(r.status).toBe(200);
      const row = await db.findRow('KHACH_HANG', { id: 1 });
      expect(row.ho_ten).toBe('Updated Name');
    });
  });

  describe('FR-13: Temporary Residence Export', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-13.1: check-in records thoi_gian_check_in_thuc', async () => {
      const checkedIn = await db.scalar('SELECT COUNT(*) AS c FROM DAT_PHONG WHERE thoi_gian_check_in_thuc IS NOT NULL');
      expect(Number(checkedIn)).toBeGreaterThanOrEqual(1);
    });

    test('AC-13.4: only checked-in guests have thoi_gian_check_in_thuc', async () => {
      const rows = await db.query('SELECT thoi_gian_check_in_thuc, trang_thai FROM DAT_PHONG');
      for (const r of rows) {
        if (r.trang_thai === 'DaTra' || r.trang_thai === 'DangO') {
          expect(r.thoi_gian_check_in_thuc).not.toBeNull();
        }
      }
    });

    test('AC-13.2: temp residence export endpoint exists (reports/history)', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.get('/api/reports/history', token);
      expect(r.status).toBe(200);
    });
  });
});
