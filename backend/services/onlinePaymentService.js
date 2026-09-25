import Stripe from 'stripe';
import { pool, withTransaction } from '../config/db.js';
import { createError } from '../utils/errors.js';
import { auditLogService } from './auditLogService.js';

// VND is a zero-decimal currency: a Stripe amount of 500000 means 500,000 ₫.
// Never divide webhook amounts by 100.

function defaultClient() {
  return process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
}

async function getBooking(bookingId) {
  const [rows] = await pool.execute(
    `SELECT dp.id, dp.khach_hang_id, dp.trang_thai, dp.tien_coc,
            hd.id AS invoice_id, hd.tong_cong
     FROM DAT_PHONG dp
     LEFT JOIN HOA_DON hd ON hd.dat_phong_id = dp.id
     WHERE dp.id = ?`,
    [bookingId]
  );
  if (!rows[0]) throw createError('NOT_FOUND');
  return rows[0];
}

export const onlinePaymentService = {
  stripe: defaultClient(),

  _setClient(client) {
    this.stripe = client;
  },

  _resetClient() {
    this.stripe = defaultClient();
  },

  requireClient() {
    if (!this.stripe) throw createError('PAYMENT_GATEWAY_UNAVAILABLE');
    return this.stripe;
  },

  async createPaymentIntent({ bookingId, amount, gatewayToken, user }) {
    const client = this.requireClient();
    const booking = await getBooking(bookingId);
    if (Number(booking.khach_hang_id) !== Number(user?.id)) throw createError('PERMISSION_DENIED');
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      throw createError('VALIDATION_ERROR', { message: 'Số tiền thanh toán không hợp lệ' });
    }
    if (['Huy', 'NoShow', 'DaTra'].includes(booking.trang_thai)) {
      throw createError('INVALID_STATUS_TRANSITION', { message: 'Không thể thanh toán cho đặt phòng đã hủy/hoàn tất' });
    }

    // Đặt phòng online chưa có hóa đơn → tạo luôn để thanh toán gắn đúng hóa đơn.
    let invoiceId = booking.invoice_id;
    if (!invoiceId) {
      const { invoiceService } = await import('./invoiceService.js');
      const invoice = await invoiceService.generate(bookingId, user);
      invoiceId = invoice.id;
    }

    const params = {
      amount: Math.round(value),
      currency: 'vnd',
      metadata: { booking_id: String(bookingId), invoice_id: String(invoiceId), customer_id: String(user.id) },
      description: `Đặt phòng #${bookingId}`,
    };
    // Chỉ nhận Stripe PaymentMethod token, tuyệt đối không nhận số thẻ thô.
    if (gatewayToken && gatewayToken.startsWith('pm_')) {
      params.payment_method = gatewayToken;
      params.confirm = true;
      params.return_url = process.env.STRIPE_RETURN_URL || 'https://example.invalid/payment/return';
    }
    try {
      const intent = await client.paymentIntents.create(params);
      await auditLogService.log(user, 'online_payment_intent', `Tạo PaymentIntent ${intent.id} cho booking #${bookingId}`);
      return { payment_intent_id: intent.id, status: intent.status, client_secret: intent.client_secret, requires_action: intent.status === 'requires_action' };
    } catch (error) {
      await auditLogService.log(user, 'online_payment_failed', `PaymentIntent lỗi cho booking #${bookingId}`);
      if (error.code === 'card_error' || error.type === 'StripeCardError') throw createError('PAYMENT_GATEWAY_ERROR', { message: error.message });
      throw createError('PAYMENT_GATEWAY_ERROR');
    }
  },

  async webhook(payload, signature) {
    const client = this.requireClient();
    let event;
    try {
      event = client.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch {
      throw createError('PAYMENT_GATEWAY_ERROR', { message: 'Webhook chữ ký không hợp lệ' });
    }
    return this.handlePaymentEvent(event);
  },

  // Unit-testable core: applies a verified payment_intent.succeeded event.
  async handlePaymentEvent(event) {
    if (event.type !== 'payment_intent.succeeded') return { handled: false };
    const intent = event.data.object;
    const invoiceId = Number(intent.metadata?.invoice_id);
    if (!invoiceId) return { handled: false };
    const note = `stripe:${intent.id}`;
    const receivedRaw = Number(intent.amount_received || intent.amount || 0);
    if (receivedRaw <= 0) return { handled: false };

    const result = await withTransaction(async (conn) => {
      const [existing] = await conn.execute('SELECT id FROM THANH_TOAN WHERE ghi_chu = ? LIMIT 1', [note]);
      if (existing.length) return { handled: true, duplicate: true };
      const [invoiceRows] = await conn.execute('SELECT * FROM HOA_DON WHERE id = ? FOR UPDATE', [invoiceId]);
      if (!invoiceRows[0]) return { handled: false };
      const invoice = invoiceRows[0];
      const [paidRows] = await conn.execute('SELECT COALESCE(SUM(so_tien), 0) AS total FROM THANH_TOAN WHERE hoa_don_id = ?', [invoiceId]);
      const paid = Number(paidRows[0].total);
      const remaining = Number(invoice.tong_cong) - paid;
      if (remaining <= 0) return { handled: true, duplicate: true, payment_status: invoice.trang_thai_thanh_toan };
      // Tiền đã rơi khỏi thẻ/ví của khách: ghi nhận phần nằm trong hạn mức còn
      // lại và ghi cảnh báo nếu gateway trả vượt số tiền phải thu (US-27).
      const received = Math.min(receivedRaw, remaining);
      await conn.execute(
        `INSERT INTO THANH_TOAN (hoa_don_id, so_tien, hinh_thuc, ghi_chu) VALUES (?, ?, 'ChuyenKhoan', ?)`,
        [invoiceId, received, note]
      );
      const newPaid = paid + received;
      const status = newPaid >= Number(invoice.tong_cong) ? 'DaThanhToan' : 'ThanhToanMotPhan';
      await conn.execute('UPDATE HOA_DON SET trang_thai_thanh_toan = ? WHERE id = ?', [status, invoiceId]);
      return { handled: true, payment_status: status, recorded: received, excess: receivedRaw - received };
    });
    if (result.excess > 0) {
      await auditLogService.log(null, 'online_payment_excess', `Webhook ${intent.id}: gateway trả ${result.excess + result.recorded} ₫, chỉ ghi nhận ${result.recorded} ₫ cho hóa đơn #${invoiceId}`);
    }
    return result;
  },
};
