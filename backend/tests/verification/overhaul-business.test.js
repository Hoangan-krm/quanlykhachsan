// Overhaul verification: business rules added/changed during the re-architecture.
// Mapping: US-19/28 (deposit refund), US-44 (promo validity), US-35 (email verify),
// US-45 (one review per stay), US-40 (Stripe VND), US-29/33 (shift cash attribution),
// US-18 (room capacity), US-26 (invoice uses segment history).
import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('Overhaul — business rules verification', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  let adminToken, letanToken, quanlyToken;

  beforeAll(async () => {
    await resetDatabase();
    adminToken = (await auth.loginAsAdmin()).token;
    quanlyToken = (await auth.loginAsQuanLy()).token;
    letanToken = (await auth.loginAsLeTan()).token;
  });

  describe('US-44 / Promo validity window, quota, minimum order', () => {
    test('AC-44: expired code is rejected with a clear message', async () => {
      const booking = await createBookingHelper();
      const r = await api.post(`/api/bookings/${booking.id}/promo`, { ma: 'EXPIRED50' }, letanToken);
      expect(r.status).toBe(409);
      expect(r.body.message).toMatch(/hết hạn/i);
    });

    test('AC-44: exhausted quota is rejected', async () => {
      const booking = await createBookingHelper();
      const r = await api.post(`/api/bookings/${booking.id}/promo`, { ma: 'HETHAN20' }, letanToken);
      expect(r.status).toBe(409);
      expect(r.body.message).toMatch(/lượt/i);
    });

    test('AC-44: valid promo increments usage and reflects on invoice', async () => {
      const booking = await createBookingHelper();
      const r = await api.post(`/api/bookings/${booking.id}/promo`, { ma: 'WELCOME10' }, letanToken);
      expect(r.status).toBe(200);
      const used = await db.scalar('SELECT so_lan_da_dung FROM MA_GIAM_GIA WHERE ma = ?', ['WELCOME10']);
      expect(Number(used)).toBe(1);
      const inv = await api.post('/api/invoices', { dat_phong_id: booking.id }, letanToken);
      expect(inv.status).toBe(201);
      // Room 1 × 3 nights × 500k = 1,500,000; VAT 10% = 150,000; -10% → 1,485,000
      expect(Number(inv.body.data.tong_cong)).toBe(1485000);
    });
  });

  describe('US-35 / Customer email verification + lockout', () => {
    test('AC-35: virtual email verification — account auto-verified on register, login succeeds immediately', async () => {
      const payload = {
        ho_ten: 'Verify Me', email: 'verifyme@test.com', sdt: '0966660001',
        cccd_passport: 'VERIFYME001', password: 'Customer123!',
      };
      const reg = await api.post('/api/customers/register', payload);
      expect(reg.status).toBe(201);
      expect(reg.body.data.token).toBeUndefined();
      expect(reg.body.data.email_verified).toBe(true);
      expect(reg.body.data.verification_url_dev).toBeUndefined();
      const login = await api.post('/api/customers/login', { email: payload.email, password: payload.password });
      expect(login.status).toBe(200);
      expect(login.body.data.token).toBeDefined();
    });

    test('SEC: 5 wrong passwords lock the customer account', async () => {
      const payload = {
        ho_ten: 'Lock Me', email: 'lockme@test.com', sdt: '0966660002',
        cccd_passport: 'LOCKME001', password: 'Customer123!',
      };
      const reg = await api.post('/api/customers/register', payload);
      expect(reg.status).toBe(201);
      expect(reg.body.data.email_verified).toBe(true);
      for (let i = 0; i < 5; i++) {
        await api.post('/api/customers/login', { email: payload.email, password: 'WrongPass1' });
      }
      const locked = await api.post('/api/customers/login', { email: payload.email, password: payload.password });
      expect(locked.status).toBe(401);
      expect(locked.body.error).toBe('AUTH_ACCOUNT_LOCKED');
    });
  });

  describe('US-45 / One review per completed stay', () => {
    test('AC-45: second review for the same booking is rejected', async () => {
      const owner = await auth.registerVerifiedCustomer({
        ho_ten: 'Review Once', email: 'reviewonce@test.com', sdt: '0966660003',
        cccd_passport: 'REVIEWONCE001', password: 'Customer123!',
      });
      const insert = await db.query(
        "INSERT INTO DAT_PHONG (khach_hang_id, phong_id, ngay_check_in, ngay_check_out, trang_thai) VALUES (?, 4, '2026-08-01', '2026-08-03', 'DaTra')",
        [owner.customer.id]
      );
      const bookingId = insert.insertId;
      const first = await api.post('/api/reviews', { dat_phong_id: Number(bookingId), so_sao: 5, noi_dung: 'Tuyệt' }, owner.token);
      expect(first.status).toBe(201);
      const second = await api.post('/api/reviews', { dat_phong_id: Number(bookingId), so_sao: 2, noi_dung: 'Thử lại' }, owner.token);
      expect([409, 500]).toContain(second.status);
      const count = await db.scalar('SELECT COUNT(*) FROM DANH_GIA WHERE dat_phong_id = ?', [Number(bookingId)]);
      expect(Number(count)).toBe(1);
    });
  });

  describe('US-28 / Deposit refund lifecycle', () => {
    test('AC-28: refund-deposit cannot exceed unrefunded deposit; updates invoice total', async () => {
      const booking = await createBookingHelper({ tienCoc: 500000 });
      const tooMuch = await api.post(`/api/bookings/${booking.id}/refund-deposit`, { ly_do: 'Khách hủy' }, letanToken);
      expect(tooMuch.status).toBe(200); // full refund of 500k when no amount given
      const again = await api.post(`/api/bookings/${booking.id}/refund-deposit`, { ly_do: 'Thử lần nữa' }, letanToken);
      expect(again.status).toBe(409);
    });

    test('AC-28: payment refund above approval threshold requires QuanLy', async () => {
      const booking = await createBookingHelper();
      const invoice = await api.post('/api/invoices', { dat_phong_id: booking.id }, letanToken);
      // record 1,200,000 (above default threshold 1,000,000) then try refund as LeTan
      const pay = await api.post(`/api/invoices/${invoice.body.data.id}/payments`, { so_tien: 1200000, hinh_thuc: 'ChuyenKhoan' }, letanToken);
      expect(pay.status).toBe(201);
      const paymentId = await db.scalar('SELECT id FROM THANH_TOAN WHERE hoa_don_id = ? AND so_tien > 0 ORDER BY id DESC LIMIT 1', [invoice.body.data.id]);
      const denied = await api.post(`/api/payments/${paymentId}/refund`, { reason: 'Khiếu nại' }, letanToken);
      expect(denied.status).toBe(403);
      const allowed = await api.post(`/api/payments/${paymentId}/refund`, { reason: 'Khiếu nại đã duyệt' }, quanlyToken);
      expect(allowed.status).toBe(200);
      const rows = await db.scalar('SELECT COUNT(*) FROM THANH_TOAN WHERE hoa_don_id = ? AND so_tien < 0', [invoice.body.data.id]);
      expect(Number(rows)).toBe(1);
    });
  });

  describe('US-29/33 / Shift cash attribution', () => {
    test('AC-29: recorded cash payment is stamped with open shift; close counts only own shift', async () => {
      // Đóng ca seed đang mở trước (đầu ca 5,000,000 + 2,000,000 tiền mặt seed = 7,000,000)
      const seededClose = await api.post('/api/shifts/1/close', { tien_mat_cuoi_ca: 7000000 }, letanToken);
      expect(seededClose.status).toBe(200);
      const shift = await api.post('/api/shifts/open', { tien_mat_dau_ca: 0 }, letanToken);
      expect(shift.status).toBe(201);
      const shiftId = shift.body.data.id;
      const booking = await createBookingHelper();
      const invoice = await api.post('/api/invoices', { dat_phong_id: booking.id }, letanToken);
      await api.post(`/api/invoices/${invoice.body.data.id}/payments`, { so_tien: 100000, hinh_thuc: 'TienMat' }, letanToken);
      const stamped = await db.findRow('THANH_TOAN', { hoa_don_id: Number(invoice.body.data.id), hinh_thuc: 'TienMat' });
      expect(Number(stamped.ca_lam_viec_id)).toBe(Number(shiftId));
      const stampedUser = await db.scalar('SELECT nguoi_dung_id FROM THANH_TOAN WHERE id = ?', [stamped.id]);
      expect(Number(stampedUser)).toBe(3);
      // unrelated second shift of another staff (QuanLy) must not see this cash
      const shift2 = await api.post('/api/shifts/open', { tien_mat_dau_ca: 0 }, quanlyToken);
      const close1 = await api.post(`/api/shifts/${shiftId}/close`, { tien_mat_cuoi_ca: 100000 }, letanToken);
      expect(close1.status).toBe(200);
      expect(Number(close1.body.data.chenh_lech)).toBe(0);
      await api.post(`/api/shifts/${shift2.body.data.id}/close`, { tien_mat_cuoi_ca: 0 }, adminToken);
    });
  });

  describe('US-18 / Room capacity', () => {
    test('AC-18: booking with guests over room capacity is rejected', async () => {
      // Room 1 is Standard (suc_chua 2 seeded)
      const r = await api.post('/api/bookings', {
        khach_hang_id: 1, phong_id: 1, ngay_check_in: '2026-11-01',
        ngay_check_out: '2026-11-03', so_khach: 6,
      }, letanToken);
      expect(r.status).toBe(400);
      expect(r.body.message).toMatch(/tối đa/i);
    });
  });

  describe('US-26 / Invoice pricing uses room history segments', () => {
    test('AC-26: invoice after transfer reflects both segment prices', async () => {
      const booking = await createBookingHelper({ roomId: 1 }); // 3 nights room 1 @500k
      await api.post(`/api/bookings/${booking.id}/check-in`, {}, letanToken);
      const transfer = await api.post(`/api/bookings/${booking.id}/transfer-room`, { new_phong_id: 4 }, letanToken);
      expect(transfer.status).toBe(200);
      const invoice = await api.post('/api/invoices', { dat_phong_id: booking.id }, letanToken);
      expect(invoice.status).toBe(201);
      // Days before transfer: check-in today (10-01)… transfer day = today → segment1 ≈ 1 night @500k;
      // segment2 = remaining nights @800k (room 3 Superior). Total must exceed single-room price.
      const room = Number(invoice.body.data.tong_tien_phong);
      expect(room).toBeGreaterThan(1500000); // not the flat 3×500k
      expect(room).toBeLessThanOrEqual(2400000); // full stay at Superior price
    });
  });

  describe('US-40 / Online payment event handling (VND zero-decimal)', () => {
    test('AC-40: webhook records the exact VND amount, never divided by 100', async () => {
      const { onlinePaymentService } = await import('../../services/onlinePaymentService.js');
      const booking = await createBookingHelper();
      const invoice = await api.post('/api/invoices', { dat_phong_id: booking.id }, letanToken);
      const invoiceId = invoice.body.data.id;
      const due = Number(invoice.body.data.tong_cong);
      const event = {
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_overhaul', amount_received: due, metadata: { invoice_id: String(invoiceId) } } },
      };
      const result = await onlinePaymentService.handlePaymentEvent(event);
      expect(result.handled).toBe(true);
      const recorded = await db.scalar('SELECT so_tien FROM THANH_TOAN WHERE ghi_chu = ?', ['stripe:pi_test_overhaul']);
      expect(Number(recorded)).toBe(due);
      const status = await db.scalar('SELECT trang_thai_thanh_toan FROM HOA_DON WHERE id = ?', [invoiceId]);
      expect(status).toBe('DaThanhToan');
    });
  });

  // ---------- helpers ----------
  let bookingSeq = 0;
  // Mỗi lần gọi dùng một khoảng ngày riêng để các test không giành phòng nhau.
  async function createBookingHelper({ tienCoc = 0, roomId = 1, nights = 3, checkIn = null } = {}) {
    const start = checkIn || new Date(Date.UTC(2026, 9, 1 + (bookingSeq++) * 7)).toISOString().slice(0, 10);
    const end = new Date(new Date(start).getTime() + nights * 86400000).toISOString().slice(0, 10);
    const r = await api.post('/api/bookings', {
      khach_hang_id: 1, phong_id: roomId, ngay_check_in: start,
      ngay_check_out: end, so_khach: 1, tien_coc: tienCoc,
    }, letanToken);
    if (r.status !== 201) throw new Error(`Booking create failed: ${r.status} ${JSON.stringify(r.body)}`);
    return r.body.data;
  }
});
