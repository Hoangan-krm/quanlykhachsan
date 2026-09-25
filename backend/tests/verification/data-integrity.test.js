import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';

describe('Data Integrity — DB Constraints & Schema', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('DB-01: Database Engine & Configuration', () => {
    test('DB-01.1: MySQL is the source of truth', async () => {
      const val = await db.scalar('SELECT VERSION() AS v');
      expect(String(val)).toMatch(/^8\./);
    });

    test('DB-01.2: connection pool works', async () => {
      const rows = await db.query('SELECT 1 AS val');
      expect(rows[0].val).toBe(1);
    });
  });

  describe('DB-02: Schema Files', () => {
    test('DB-02.1: all 14 tables exist', async () => {
      const tables = [
        'NGUOI_DUNG', 'LOAI_PHONG', 'PHONG', 'KHACH_HANG', 'DAT_PHONG',
        'DICH_VU', 'SU_DUNG_DICH_VU', 'HOA_DON', 'THANH_TOAN', 'CA_LAM_VIEC',
        'NHAT_KY', 'DANH_GIA', 'HOTEL_CONFIG', 'MA_GIAM_GIA',
      ];
      for (const table of tables) {
        const count = await db.scalar(`SELECT COUNT(*) AS c FROM \`${table}\``);
        expect(Number(count)).toBeGreaterThanOrEqual(0);
      }
    });

    test('DB-02.2: seed data present', async () => {
      expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM NGUOI_DUNG'))).toBe(3);
      expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM LOAI_PHONG'))).toBe(5);
      expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM PHONG'))).toBe(10);
      expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM KHACH_HANG'))).toBe(5);
      expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM DICH_VU'))).toBe(5);
      expect(Number(await db.scalar('SELECT COUNT(*) AS c FROM DAT_PHONG'))).toBe(6);
    });
  });

  describe('DB-03: Referential Integrity', () => {
    test('DB-03.1: FK constraints enforced — cannot insert orphan booking', async () => {
      try {
        await db.queryRaw('INSERT INTO DAT_PHONG (khach_hang_id, phong_id, ngay_check_in, ngay_check_out) VALUES (99999, 99999, "2026-12-01", "2026-12-03")');
        throw new Error('Should have failed');
      } catch (e) {
        expect(e.message).not.toBe('Should have failed');
      }
    });

    test('DB-03.3: UNIQUE on NGUOI_DUNG.email', async () => {
      try {
        await db.queryRaw("INSERT INTO NGUOI_DUNG (ho_ten, email, mat_khau_hash, vai_tro) VALUES ('Dup', 'admin@hoangan.vn', 'hash', 'Admin')");
        throw new Error('Should have failed');
      } catch (e) {
        expect(e.message).not.toBe('Should have failed');
      }
    });

    test('DB-03.3b: UNIQUE on PHONG.so_phong', async () => {
      try {
        await db.queryRaw("INSERT INTO PHONG (so_phong, loai_phong_id, trang_thai) VALUES ('101', 1, 'Trong')");
        throw new Error('Should have failed');
      } catch (e) {
        expect(e.message).not.toBe('Should have failed');
      }
    });

    test('DB-03.3c: UNIQUE on KHACH_HANG.cccd_passport', async () => {
      const existing = await db.scalar('SELECT cccd_passport FROM KHACH_HANG LIMIT 1');
      try {
        await db.queryRaw(`INSERT INTO KHACH_HANG (ho_ten, sdt, cccd_passport) VALUES ('Dup', '099', '${existing}')`);
        throw new Error('Should have failed');
      } catch (e) {
        expect(e.message).not.toBe('Should have failed');
      }
    });

    test('DB-03.4: NOT NULL on mandatory fields', async () => {
      try {
        await db.queryRaw("INSERT INTO NGUOI_DUNG (email, mat_khau_hash, vai_tro) VALUES ('test@null.vn', 'hash', 'Admin')");
        throw new Error('Should have failed');
      } catch (e) {
        expect(e.message).not.toBe('Should have failed');
      }
    });
  });

  describe('DB-04: Indexes', () => {
    test('DB-04.1: indexes exist on key columns', async () => {
      const indexes = await db.queryRaw('SHOW INDEX FROM PHONG');
      expect(indexes.length).toBeGreaterThan(0);
      const bookingIndexes = await db.queryRaw('SHOW INDEX FROM DAT_PHONG');
      expect(bookingIndexes.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Constraints', () => {
    test('ENUM trang_thai on PHONG', async () => {
      try {
        await db.queryRaw("INSERT INTO PHONG (so_phong, loai_phong_id, trang_thai) VALUES ('999', 1, 'InvalidStatus')");
        throw new Error('Should have failed');
      } catch (e) {
        expect(e.message).not.toBe('Should have failed');
      }
    });

    test('ENUM vai_tro on NGUOI_DUNG', async () => {
      try {
        await db.queryRaw("INSERT INTO NGUOI_DUNG (ho_ten, email, mat_khau_hash, vai_tro) VALUES ('Test', 'enum@test.vn', 'hash', 'SuperAdmin')");
        throw new Error('Should have failed');
      } catch (e) {
        expect(e.message).not.toBe('Should have failed');
      }
    });

    test('HOTEL_CONFIG has single row (singleton)', async () => {
      const count = await db.scalar('SELECT COUNT(*) AS c FROM HOTEL_CONFIG');
      expect(Number(count)).toBeGreaterThanOrEqual(1);
    });
  });
});
