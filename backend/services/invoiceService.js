import { hoaDonRepository } from '../repositories/hoaDon.repository.js';
import { suDungDichVuRepository } from '../repositories/suDungDichVu.repository.js';
import { auditLogService } from './auditLogService.js';
import { withTransaction, pool } from '../config/db.js';
import { createError } from '../utils/errors.js';
import { lockBooking, calculateCharges } from './billing.js';

const vnd = value => Number(value || 0).toLocaleString('vi-VN');

export const invoiceService = {
  async list({ page, limit, offset, trang_thai_thanh_toan }) {
    return hoaDonRepository.findAll({ page, limit, offset, trang_thai_thanh_toan });
  },

  async getById(id) {
    const invoice = await hoaDonRepository.findById(id);
    if (!invoice) throw createError('NOT_FOUND');
    const services = await suDungDichVuRepository.findByBookingId(invoice.dat_phong_id);
    // DECIMAL từ MySQL trả về string — chuẩn hóa về số cho API nhất quán.
    for (const key of ['tong_tien_phong', 'tong_tien_dich_vu', 'thue_vat', 'tong_cong']) {
      invoice[key] = Number(invoice[key]);
    }
    return { ...invoice, services };
  },

  async getByBookingId(bookingId) {
    const invoice = await hoaDonRepository.findByBookingId(bookingId);
    if (!invoice) throw createError('NOT_FOUND');
    return invoice;
  },

  // Pricing always goes through calculateCharges so segment history (room
  // transfers, late fees), VAT, promo and deposit are applied consistently.
  async generate(bookingId, user) {
    const invoice = await withTransaction(async conn => {
      const booking = await lockBooking(conn, bookingId);
      const [existing] = await conn.execute('SELECT id FROM HOA_DON WHERE dat_phong_id=? FOR UPDATE', [bookingId]);
      if (existing.length) throw createError('INVOICE_ALREADY_EXISTS');
      const charges = await calculateCharges(conn, booking);
      const [result] = await conn.execute(
        `INSERT INTO HOA_DON (dat_phong_id, tong_tien_phong, tong_tien_dich_vu, thue_vat, tong_cong, trang_thai_thanh_toan)
         VALUES (?, ?, ?, ?, ?, 'ChuaThanhToan')`,
        [bookingId, charges.tong_tien_phong, charges.tong_tien_dich_vu, charges.thue_vat, charges.tong_cong]
      );
      return { id: result.insertId, ...charges };
    });
    await auditLogService.log(user, 'generate_invoice', `Tạo hóa đơn #${invoice.id} cho booking #${bookingId}, tổng: ${invoice.tong_cong}`);
    return await this.getById(invoice.id);
  },

  async generatePdf(id) {
    const invoice = await this.getById(id);
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const [configRows] = await pool.execute('SELECT * FROM HOTEL_CONFIG WHERE id=1');
    const config = configRows[0];
    const [bookingRows] = await pool.execute('SELECT * FROM DAT_PHONG WHERE id=?', [invoice.dat_phong_id]);
    const charges = await calculateCharges(pool, bookingRows[0]);

    doc.fontSize(20).text(config.ten_khach_san, { align: 'center' });
    doc.fontSize(10).text(config.dia_chi, { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('HÓA ĐƠN', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Mã hóa đơn: ${config.ma_hoa_don_mau}-${String(invoice.id).padStart(5, '0')}`);
    doc.text(`Khách hàng: ${invoice.ten_khach}`);
    doc.text(`Phòng: ${invoice.so_phong} (${invoice.ten_loai_phong})`);
    doc.text(`Check-in: ${invoice.ngay_check_in} - Check-out: ${invoice.ngay_check_out}`);
    doc.moveDown();
    doc.text(`Tiền phòng: ${vnd(invoice.tong_tien_phong)} ₫`);
    doc.text(`Tiền dịch vụ (gồm phụ phí): ${vnd(invoice.tong_tien_dich_vu)} ₫`);
    doc.text(`Thuế VAT (${Number(config.vat) * 100}%): ${vnd(invoice.thue_vat)} ₫`);
    if (charges.phan_tram_giam > 0) {
      const discountAmount = Math.round((charges.tong_tien_phong + charges.tong_tien_dich_vu + charges.thue_vat) * charges.phan_tram_giam) / 100;
      doc.text(`Giảm giá (${charges.phan_tram_giam}%): -${vnd(discountAmount)} ₫`);
    }
    doc.text(`Tiền cọc đã trừ: -${vnd(charges.tien_coc)} ₫`);
    doc.moveDown();
    doc.fontSize(14).text(`Tổng cộng: ${vnd(invoice.tong_cong)} ₫`);
    doc.fontSize(10).text(`Trạng thái thanh toán: ${invoice.trang_thai_thanh_toan}`);
    doc.end();

    return doc;
  },
};
