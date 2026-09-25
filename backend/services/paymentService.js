import { thanhToanRepository } from '../repositories/thanhToan.repository.js';
import { caLamViecRepository } from '../repositories/caLamViec.repository.js';
import { hotelConfigRepository } from '../repositories/hotelConfig.repository.js';
import { auditLogService } from './auditLogService.js';
import { withTransaction } from '../config/db.js';
import { createError } from '../utils/errors.js';
import { onlinePaymentService } from './onlinePaymentService.js';

export const paymentService = {
  async listByInvoice(invoiceId) {
    return thanhToanRepository.findByInvoiceId(invoiceId);
  },

  async listAll({ page, limit, offset, hinh_thuc, from, to }) {
    const { rows, total } = await thanhToanRepository.findAllWithFilters({ page, limit, offset, hinh_thuc, from, to });
    return { rows, total };
  },

  async record(invoiceId, amount, method, staffId, user, ghiChu) {
    const result = await withTransaction(async (conn) => {
      // Lock the invoice row so concurrent payments cannot both observe the same balance.
      const [invoices] = await conn.execute('SELECT * FROM HOA_DON WHERE id = ? FOR UPDATE', [invoiceId]);
      const invoice = invoices[0];
      if (!invoice) throw createError('NOT_FOUND');
      const [paidRows] = await conn.execute('SELECT COALESCE(SUM(so_tien), 0) AS total FROM THANH_TOAN WHERE hoa_don_id = ?', [invoiceId]);
      const paidSoFar = Number(paidRows[0].total);
      const remaining = Number(invoice.tong_cong) - paidSoFar;
      if (amount > remaining) throw createError('OVERPAYMENT', { details: { max_allowed: remaining } });
      // Gắn giao dịch tiền mặt với ca đang mở của nhân viên để đối soát cuối ca.
      const openShift = staffId ? await caLamViecRepository.findCurrentOpen(staffId) : null;
      const [payResult] = await conn.execute(
        'INSERT INTO THANH_TOAN (hoa_don_id, so_tien, hinh_thuc, ghi_chu, nguoi_dung_id, ca_lam_viec_id) VALUES (?, ?, ?, ?, ?, ?)',
        [invoiceId, amount, method, ghiChu || null, staffId || null, openShift?.id || null]
      );
      const newTotal = paidSoFar + amount;
      let status = 'ChuaThanhToan';
      if (newTotal >= Number(invoice.tong_cong)) status = 'DaThanhToan';
      else if (newTotal > 0) status = 'ThanhToanMotPhan';
      await conn.execute('UPDATE HOA_DON SET trang_thai_thanh_toan = ? WHERE id = ?', [status, invoiceId]);
      return { id: payResult.insertId, invoice_status: status };
    });

    await auditLogService.log(user, 'payment', `Thanh toán ${amount} ₫ cho hóa đơn #${invoiceId}, hình thức: ${method}`);
    return result;
  },

  // Hoàn tiền thanh toán (US-28): bắt buộc lý do, không vượt số đã thu,
  // và vượt ngưỡng cấu hình thì phải do QuanLy/Admin phê duyệt.
  async assertRefundApproval(amount, user) {
    const config = await hotelConfigRepository.get();
    const threshold = Number(config.nguong_duyet_hoan_tien || 0);
    if (threshold > 0 && amount > threshold && user?.vai_tro === 'LeTan') {
      throw createError('PERMISSION_DENIED', {
        message: `Hoàn tiền trên ${Number(threshold).toLocaleString('vi-VN')} ₫ cần Quản lý phê duyệt`,
      });
    }
  },

  async refund(paymentId, reason, user, refundAmount) {
    const refunded = await withTransaction(async (conn) => {
      const [payments] = await conn.execute('SELECT * FROM THANH_TOAN WHERE id = ? FOR UPDATE', [paymentId]);
      const payment = payments[0];
      if (!payment) throw createError('NOT_FOUND');
      const collectedRows = await conn.execute('SELECT COALESCE(SUM(so_tien), 0) AS total FROM THANH_TOAN WHERE hoa_don_id = ?', [payment.hoa_don_id]);
      const collected = Number(collectedRows[0][0].total);
      const amountToRefund = refundAmount != null ? Number(refundAmount) : Number(payment.so_tien);
      if (amountToRefund <= 0) throw createError('VALIDATION_ERROR', { message: 'Số tiền hoàn phải lớn hơn 0' });
      if (amountToRefund > Number(payment.so_tien)) {
        throw createError('REFUND_EXCEEDS_COLLECTED', { message: 'Số tiền hoàn không được vượt quá số tiền của giao dịch gốc' });
      }
      if (amountToRefund > collected) {
        throw createError('REFUND_EXCEEDS_COLLECTED');
      }
      await this.assertRefundApproval(amountToRefund, user);
      await conn.execute(
        'INSERT INTO THANH_TOAN (hoa_don_id, so_tien, hinh_thuc, ghi_chu, nguoi_dung_id, ca_lam_viec_id, hoan_cho_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [payment.hoa_don_id, -amountToRefund, payment.hinh_thuc, `Hoàn lại: ${reason}`, user?.id ?? null,
         payment.hinh_thuc === 'TienMat' && user?.id ? (await caLamViecRepository.findCurrentOpen(user.id))?.id ?? null : null, payment.id]
      );
      const [invoices] = await conn.execute('SELECT * FROM HOA_DON WHERE id = ? FOR UPDATE', [payment.hoa_don_id]);
      const invoice = invoices[0];
      if (invoice) {
        const newPaid = collected - amountToRefund;
        let status = 'ChuaThanhToan';
        if (newPaid >= Number(invoice.tong_cong)) status = 'DaThanhToan';
        else if (newPaid > 0) status = 'ThanhToanMotPhan';
        await conn.execute('UPDATE HOA_DON SET trang_thai_thanh_toan = ? WHERE id = ?', [status, invoice.id]);
      }
      return amountToRefund;
    });

    await auditLogService.log(user, 'refund', `Hoàn ${refunded} ₫ cho hóa đơn #${paymentId}, lý do: ${reason}`);
    return { success: true, refunded_amount: refunded };
  },

  async refundBookingDeposit(bookingId, reason, user, amount) {
    const { bookingService } = await import('./bookingService.js');
    return bookingService.refundDeposit(bookingId, amount, reason, user);
  },

  async onlinePayment(bookingId, amount, gatewayToken, user) {
    return onlinePaymentService.createPaymentIntent({ bookingId, amount, gatewayToken, user });
  },
};
