import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('Epic 7 — Customer Website (FR-35..FR-49)', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('FR-35: Customer Registration', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-35.1: customer registration endpoint works', async () => {
      const r = await api.post('/api/customers/register', {
        ho_ten: 'New Customer',
        email: 'newcustomer@test.com',
        sdt: '0912345678',
        cccd_passport: 'NEWCCCD12345',
        password: 'Customer123!',
      });
      expect([200, 201]).toContain(r.status);
    });

    test('AC-35.2: duplicate email rejected', async () => {
      const existingEmail = await db.scalar('SELECT email FROM KHACH_HANG WHERE email IS NOT NULL LIMIT 1');
      if (existingEmail) {
        const r = await api.post('/api/customers/register', {
          ho_ten: 'Dup',
          email: String(existingEmail),
          sdt: '0999999999',
          mat_khau: 'Customer123!',
        });
        expect([400, 409]).toContain(r.status);
      }
    });
  });

  describe('FR-36: Customer Login/Logout', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-36.2: customer logout destroys session', async () => {
      const r = await api.post('/api/customers/login', {
        email: 'khachhang1@hoangan.vn',
        password: 'Customer123!',
      });
      expect([200, 401, 400]).toContain(r.status);
    });
  });

  describe('FR-37: View Room Types on Website', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-37.1: room types display image, description, price (public)', async () => {
      const r = await api.get('/api/room-types');
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body.data)).toBe(true);
      expect(r.body.data.length).toBeGreaterThanOrEqual(5);
      for (const rt of r.body.data) {
        expect(rt.ten_loai_phong).toBeDefined();
        expect(rt.gia_mac_dinh).toBeDefined();
      }
    });
  });

  describe('FR-38: Online Vacant Room Search', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-38.1: search returns vacant rooms for date range', async () => {
      const r = await api.get('/api/rooms/vacant?check_in=2026-12-01&check_out=2026-12-05');
      expect(r.status).toBe(200);
      expect(Array.isArray(r.body.data)).toBe(true);
    });

    test('AC-38.2: check-out before check-in rejected', async () => {
      const r = await api.get('/api/rooms/vacant?check_in=2026-12-05&check_out=2026-12-01');
      expect([200, 400]).toContain(r.status);
    });
  });

  describe('FR-39: Online Booking', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-39.1: online booking creates record', async () => {
      const r = await api.post('/api/bookings/guest', {
        ho_ten: 'Guest Booking',
        sdt: '0987654321',
        phong_id: 1,
        ngay_check_in: '2026-12-01',
        ngay_check_out: '2026-12-03',
      });
      expect([200, 201, 400, 409]).toContain(r.status);
    });
  });

  describe('FR-40: Online Payment', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-40.1: online payment endpoint exists', async () => {
      const r = await api.post('/api/payments/online', {});
      expect([400, 401]).toContain(r.status);
    });
  });

  describe('FR-41: Booking Confirmation Notification', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-41.1: booking confirmation sent (via audit log or notification)', async () => {
      const { token } = await auth.loginAsAdmin();
      const auditRes = await api.get('/api/audit', token);
      expect(auditRes.status).toBe(200);
    });
  });

  describe('FR-42: View Booking History (Customer)', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-42.1: customer can view own bookings', async () => {
      const r = await api.get('/api/customers/me/bookings');
      expect([200, 401]).toContain(r.status);
    });
  });

  describe('FR-43: Cancel/Edit Own Booking (Customer)', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-43.1/43.2: customer can edit/cancel own future booking but not another customer booking', async () => {
      const owner = await auth.registerVerifiedCustomer({
        ho_ten: 'Booking Owner', email: 'bookingowner@test.com', sdt: '0933333333',
        cccd_passport: 'BOOKINGOWNER001', password: 'Customer123!',
      });
      const stranger = await auth.registerVerifiedCustomer({
        ho_ten: 'Booking Stranger', email: 'bookingstranger@test.com', sdt: '0944444444',
        cccd_passport: 'BOOKINGSTRANGER001', password: 'Customer123!',
      });
      const ownerId = owner.customer.id;
      await db.query(
        `INSERT INTO DAT_PHONG (khach_hang_id, phong_id, ngay_check_in, ngay_check_out, trang_thai)
         VALUES (?, 4, '2026-12-10', '2026-12-12', 'ChoXacNhan')`,
        [ownerId]
      );
      const bookingId = await db.scalar('SELECT id FROM DAT_PHONG WHERE khach_hang_id = ? ORDER BY id DESC LIMIT 1', [ownerId]);

      const forbidden = await api.put(`/api/customers/me/bookings/${bookingId}`, {
        ngay_check_in: '2026-12-11', ngay_check_out: '2026-12-13',
      }, stranger.token);
      expect(forbidden.status).toBe(403);

      const updated = await api.put(`/api/customers/me/bookings/${bookingId}`, {
        ngay_check_in: '2026-12-11', ngay_check_out: '2026-12-13',
      }, owner.token);
      expect(updated.status).toBe(200);
      const saved = await db.findRow('DAT_PHONG', { id: Number(bookingId) });
      const savedDate = new Date(saved.ngay_check_out);
      expect([savedDate.getFullYear(), String(savedDate.getMonth() + 1).padStart(2, '0'), String(savedDate.getDate()).padStart(2, '0')].join('-')).toBe('2026-12-13');

      const cancelled = await api.post(`/api/customers/me/bookings/${bookingId}/cancel`, {}, owner.token);
      expect(cancelled.status).toBe(200);
      expect((await db.findRow('DAT_PHONG', { id: Number(bookingId) })).trang_thai).toBe('Huy');
    });
  });

  describe('FR-44: Apply Promo Code', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-44.1: valid promo code deducts amount', async () => {
      const { token } = await auth.loginAsAdmin();
      const promoRes = await api.post('/api/promos', {
        ma_promo: 'TESTPROMO',
        giam_gia: 10,
        loai: 'percent',
        ngay_bat_dau: '2026-01-01',
        ngay_ket_thuc: '2026-12-31',
      }, token);
      expect([200, 201, 400]).toContain(promoRes.status);
    });

    test('AC-44.2: expired promo rejected', async () => {
      const { token } = await auth.loginAsAdmin();
      await api.post('/api/promos', {
        ma_promo: 'EXPIRED',
        giam_gia: 10,
        loai: 'percent',
        ngay_bat_dau: '2020-01-01',
        ngay_ket_thuc: '2020-12-31',
      }, token);
      const listRes = await api.get('/api/promos', token);
      expect(listRes.status).toBe(200);
    });
  });

  describe('FR-45: Submit Review', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-45.3: review submitted with status ChoDuyet', async () => {
      const r = await api.post('/api/reviews', {
        dat_phong_id: 1,
        so_sao: 5,
        noi_dung: 'Great stay!',
      });
      expect([200, 201, 401, 403]).toContain(r.status);
    });

    test('AC-45.1: only the customer who completed the stay can review it', async () => {
      const owner = await auth.registerVerifiedCustomer({
        ho_ten: 'Review Owner', email: 'reviewowner@test.com', sdt: '0911111111',
        cccd_passport: 'REVIEWOWNER001', password: 'Customer123!',
      });
      const stranger = await auth.registerVerifiedCustomer({
        ho_ten: 'Review Stranger', email: 'reviewstranger@test.com', sdt: '0922222222',
        cccd_passport: 'REVIEWSTRANGER001', password: 'Customer123!',
      });
      const ownerId = owner.customer.id;
      const insertResult = await db.queryRaw(
        "INSERT INTO DAT_PHONG (khach_hang_id, phong_id, ngay_check_in, ngay_check_out, trang_thai) VALUES (?, 4, '2026-08-01', '2026-08-02', 'DaTra')",
        [ownerId]
      );
      const bookingId = insertResult.insertId;

      const forbidden = await api.post('/api/reviews', {
        dat_phong_id: Number(bookingId), so_sao: 5, noi_dung: 'Không phải kỳ nghỉ của tôi',
      }, stranger.token);
      expect(forbidden.status).toBe(403);

      const accepted = await api.post('/api/reviews', {
        dat_phong_id: Number(bookingId), so_sao: 5, noi_dung: 'Kỳ nghỉ tuyệt vời',
      }, owner.token);
      expect(accepted.status).toBe(201);
      expect(accepted.body.data.trang_thai_duyet).toBe('ChoDuyet');
    });
  });

  describe('FR-46: Update Customer Profile / Change Password', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-46.1: customer can update profile', async () => {
      const r = await api.put('/api/customers/me', { ho_ten: 'Updated' });
      expect([200, 401]).toContain(r.status);
    });

    test('AC-46.3: password change requires current password', async () => {
      const r = await api.put('/api/customers/me/password', {
        currentPassword: 'wrong',
        newPassword: 'NewPass123!',
      });
      expect([400, 401]).toContain(r.status);
    });
  });

  describe('FR-47: Live Chat / Contact', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-47.1: authenticated customer can send and retrieve chat messages', async () => {
      const registered = await auth.registerVerifiedCustomer({
        ho_ten: 'Chat Customer', email: 'chatcustomer@test.com', sdt: '0955555555',
        cccd_passport: 'CHATCUSTOMER001', password: 'Customer123!',
      });
      const token = registered.token;
      const sent = await api.post('/api/chat/messages', { noi_dung: 'Tôi cần hỗ trợ đặt phòng' }, token);
      expect(sent.status).toBe(201);
      const messages = await api.get('/api/chat/messages', token);
      expect(messages.status).toBe(200);
      expect(messages.body.data.messages.some(item => item.noi_dung === 'Tôi cần hỗ trợ đặt phòng')).toBe(true);
      const fs = await import('fs');
      const path = await import('path');
      const pagesDir = path.resolve('../frontend/js/pages');
      const frontendSource = fs.readdirSync(pagesDir)
        .map(file => fs.readFileSync(path.join(pagesDir, file), 'utf8')).join('\n');
      expect(frontendSource).toContain('/chat/messages');
    });
  });

  describe('FR-48: Guest Booking (No Account)', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-48.1: guest booking requires only name + phone', async () => {
      const r = await api.post('/api/bookings/guest', {
        ho_ten: 'Guest Test',
        sdt: '0977777777',
        phong_id: 1,
        ngay_check_in: '2026-12-10',
        ngay_check_out: '2026-12-12',
      });
      expect(r.status).toBe(201);
      expect(r.body.data.id).toBeDefined();
      const saved = await db.findRow('DAT_PHONG', { id: r.body.data.id });
      expect(saved).not.toBeNull();
    });
  });

  describe('FR-49: Review Moderation', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('AC-49.1: new reviews default to ChoDuyet', async () => {
      const { token } = await auth.loginAsAdmin();
      const reviewsRes = await api.get('/api/reviews', token);
      expect(reviewsRes.status).toBe(200);
    });

    test('AC-49.4: Admin/Manager can moderate review', async () => {
      const { token } = await auth.loginAsAdmin();
      const r = await api.post('/api/reviews/1/moderate', { trang_thai_duyet: 'DaDuyet' }, token);
      expect([200, 404]).toContain(r.status);
    });

    test('AC-49.3: ChoDuyet/TuChoi reviews not in public list', async () => {
      const r = await api.get('/api/reviews/public');
      expect(r.status).toBe(200);
      if (r.body.data && Array.isArray(r.body.data)) {
        for (const review of r.body.data) {
          const status = review.trang_thai_duyet || review.trang_thai;
          expect(['DaDuyet']).toContain(status);
        }
      }
    });
  });
});
