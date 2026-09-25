import { datPhongRepository } from '../repositories/datPhong.repository.js';
import { khachHangRepository } from '../repositories/khachHang.repository.js';
import { suDungDichVuRepository } from '../repositories/suDungDichVu.repository.js';
import { hoaDonRepository } from '../repositories/hoaDon.repository.js';
import { withTransaction, pool } from '../config/db.js';
import { auditLogService } from './auditLogService.js';
import { daysBetween } from '../utils/date.js';
import { createError } from '../utils/errors.js';
import { lockBooking, lockRooms, assertAvailable, refreshRoom, ensureSegment, calculateCharges, refreshInvoice, getValidPromo, dateOnly, hotelToday } from './billing.js';
import { assertBookingTransition } from './stateMachine.js';
import { notificationService } from './notificationService.js';

function assertGuestCount(room, soKhach) {
  if (room.suc_chua != null && Number(soKhach) > Number(room.suc_chua)) {
    throw createError('VALIDATION_ERROR', {
      message: `Loại phòng ${room.ten_loai_phong || ''} chỉ chứa tối đa ${room.suc_chua} khách`,
    });
  }
}

// Xác thực mã khuyến mãi khi tạo đặt phòng (cùng quy tắc với applyPromo).
async function resolvePromoInTxn(conn, code) {
  if (!code) return null;
  const [promos] = await conn.execute('SELECT * FROM MA_GIAM_GIA WHERE ma=?', [code]);
  const promo = promos[0];
  if (!promo) throw createError('PROMO_INVALID', { message: 'Mã giảm giá không tồn tại' });
  if (promo.trang_thai !== 'Active') throw createError('PROMO_INVALID', { message: 'Mã giảm giá đã ngừng hoạt động' });
  const today = hotelToday();
  if (promo.ngay_bat_dau && today < dateOnly(promo.ngay_bat_dau)) {
    throw createError('PROMO_INVALID', { message: `Mã chỉ có hiệu lực từ ${dateOnly(promo.ngay_bat_dau)}` });
  }
  if (promo.ngay_ket_thuc && today > dateOnly(promo.ngay_ket_thuc)) {
    throw createError('PROMO_INVALID', { message: `Mã đã hết hạn ngày ${dateOnly(promo.ngay_ket_thuc)}` });
  }
  if (promo.gioi_han_su_dung != null && Number(promo.so_lan_da_dung) >= Number(promo.gioi_han_su_dung)) {
    throw createError('PROMO_INVALID', { message: 'Mã đã hết lượt sử dụng' });
  }
  return promo;
}

async function sendBookingConfirmation(booking, customer) {
  if (!customer?.email) return;
  const nights = daysBetween(booking.ngay_check_in, booking.ngay_check_out);
  const amount = nights * Number(booking.gia_mac_dinh || 0);
  await notificationService.sendBookingConfirmation({
    id: booking.id,
    ten_khach: customer.ho_ten,
    email: customer.email,
    ngay_check_in: booking.ngay_check_in,
    ngay_check_out: booking.ngay_check_out,
    tong_tien: amount,
  });
}

export const bookingService = {
  async list({ page, limit, offset, trang_thai, khach_hang_id, from, to }) {
    return datPhongRepository.findAll({ page, limit, offset, trang_thai, khach_hang_id, from, to });
  },

  async getById(id) {
    const booking = await datPhongRepository.findById(id);
    if (!booking) throw createError('NOT_FOUND');
    const services = await suDungDichVuRepository.findByBookingId(id);
    const invoice = await hoaDonRepository.findByBookingId(id);
    const charges = await calculateCharges(pool, booking);
    return { ...booking, services, invoice, charges };
  },

  // Shared by staff creation and guest/online booking so both are atomic and
  // run the same availability, maintenance and capacity checks.
  async createBookingInTxn(conn, data, user) {
    const [room] = await lockRooms(conn, [data.phong_id]);
    if (room.trang_thai === 'BaoTri') throw createError('ROOM_NOT_AVAILABLE');
    const soKhach = Number(data.so_khach || 1);
    assertGuestCount(room, soKhach);
    const [customers] = await conn.execute('SELECT id, ho_ten, email FROM KHACH_HANG WHERE id=?', [data.khach_hang_id]);
    if (!customers.length) throw createError('NOT_FOUND');
    // Khách hàng tự đặt: chỉ được đặt cho chính mình.
    if (user?.vai_tro === 'Customer' && Number(data.khach_hang_id) !== Number(user.id)) {
      throw createError('PERMISSION_DENIED');
    }
    await assertAvailable(conn, data.phong_id, data.ngay_check_in, data.ngay_check_out);
    const promo = await resolvePromoInTxn(conn, data.ma_km);
    const online = data.nguon_dat === 'Online' || data.source === 'Online' || user?.vai_tro === 'Customer';
    const [created] = await conn.execute(
      `INSERT INTO DAT_PHONG(khach_hang_id,phong_id,nguoi_dung_id,ngay_check_in,ngay_check_out,tien_coc,so_khach,trang_thai,nguon_dat,ma_giam_gia_id)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
      [data.khach_hang_id, data.phong_id, online ? null : (user?.id ?? null), data.ngay_check_in, data.ngay_check_out, data.tien_coc || 0, soKhach, online ? 'ChoXacNhan' : 'DaDat', online ? 'Online' : 'LeTan', promo?.id ?? null]
    );
    if (promo) await conn.execute('UPDATE MA_GIAM_GIA SET so_lan_da_dung=so_lan_da_dung+1 WHERE id=?', [promo.id]);
    await refreshRoom(conn, data.phong_id);
    return { id: created.insertId, trang_thai: online ? 'ChoXacNhan' : 'DaDat', customer: customers[0], gia_mac_dinh: room.gia_mac_dinh, ngay_check_in: data.ngay_check_in, ngay_check_out: data.ngay_check_out, so_khach: soKhach };
  },

  async create(data, user) {
    const result = await withTransaction(async conn => {
      const created = await this.createBookingInTxn(conn, data, user);
      if (created.trang_thai === 'DaDat') await sendBookingConfirmation(created, created.customer);
      return created;
    });
    await auditLogService.log(user, 'create_booking', `Tạo đặt phòng #${result.id}`);
    return { id: result.id, trang_thai: result.trang_thai };
  },

  async update(id, data, user) {
    await withTransaction(async conn => {
      const booking = await lockBooking(conn, id);
      if (booking.trang_thai === 'DangO') throw createError('BOOKING_ALREADY_CHECKED_IN');
      // Chỉ sửa được đặt phòng chưa check-in và chưa kết thúc (ChoXacNhan/DaDat).
      if (!['ChoXacNhan', 'DaDat'].includes(booking.trang_thai)) throw createError('INVALID_STATUS_TRANSITION');
      const merged = { ...booking, ...data };
      if (dateOnly(merged.ngay_check_out) <= dateOnly(merged.ngay_check_in)) throw createError('VALIDATION_ERROR', { message: 'Ngày trả phòng phải sau ngày nhận phòng' });
      const rooms = await lockRooms(conn, [booking.phong_id, merged.phong_id]);
      const targetRoom = rooms.find(r => r.id === Number(merged.phong_id));
      if (targetRoom.trang_thai === 'BaoTri') throw createError('ROOM_NOT_AVAILABLE');
      if (data.so_khach != null) assertGuestCount(targetRoom, data.so_khach);
      const [customers] = await conn.execute('SELECT id FROM KHACH_HANG WHERE id=?', [merged.khach_hang_id]);
      if (!customers.length) throw createError('NOT_FOUND');
      await assertAvailable(conn, merged.phong_id, merged.ngay_check_in, merged.ngay_check_out, id);
      await conn.execute('UPDATE DAT_PHONG SET khach_hang_id=?,phong_id=?,ngay_check_in=?,ngay_check_out=?,tien_coc=?,so_khach=? WHERE id=?', [merged.khach_hang_id, merged.phong_id, merged.ngay_check_in, merged.ngay_check_out, merged.tien_coc, merged.so_khach, id]);
      await refreshRoom(conn, booking.phong_id); await refreshRoom(conn, merged.phong_id);
      await refreshInvoice(conn, merged);
    });
    await auditLogService.log(user, 'update_booking', `Cập nhật đặt phòng #${id}`);
    return { success: true };
  },

  async remove(id, user) {
    const booking = await datPhongRepository.findById(id);
    if (!booking) throw createError('NOT_FOUND');
    if (booking.trang_thai !== 'ChoXacNhan') {
      throw createError('INVALID_STATUS_TRANSITION', { message: 'Chỉ có thể xóa đặt phòng ở trạng thái Chờ xác nhận' });
    }
    await datPhongRepository.remove(id);
    await auditLogService.log(user, 'delete_booking', `Xóa đặt phòng ID ${id}`);
    return { success: true };
  },

  async cancel(id, user) {
    await withTransaction(async conn => {
      const booking = await lockBooking(conn, id);
      assertBookingTransition(booking.trang_thai, 'Huy');
      await lockRooms(conn, [booking.phong_id]);
      await conn.execute("UPDATE DAT_PHONG SET trang_thai='Huy' WHERE id=?", [id]);
      await refreshRoom(conn, booking.phong_id);
    });
    await auditLogService.log(user, 'cancel_booking', `Hủy đặt phòng #${id}`);
    return { success: true };
  },

  async guestBooking(data, user) {
    const guestIdentity = data.cccd_passport || `GUEST-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const result = await withTransaction(async conn => {
      let customer;
      const [existing] = await conn.execute('SELECT * FROM KHACH_HANG WHERE cccd_passport=?', [guestIdentity]);
      if (existing.length) {
        customer = existing[0];
      } else {
        const [ins] = await conn.execute(
          'INSERT INTO KHACH_HANG(ho_ten,sdt,cccd_passport,email) VALUES(?,?,?,?)',
          [data.ho_ten, data.sdt, guestIdentity, data.email || null]
        );
        customer = { id: ins.insertId, ho_ten: data.ho_ten, email: data.email || null };
      }
      const booking = await this.createBookingInTxn(conn, { ...data, khach_hang_id: customer.id }, user);
      await sendBookingConfirmation(booking, customer);
      return booking;
    });
    await auditLogService.log(user, 'guest_booking', `Khách vãng lai tạo đặt phòng #${result.id}`);
    return { id: result.id, trang_thai: result.trang_thai };
  },

  async checkIn(id, user) {
    await withTransaction(async conn => {
      const booking = await lockBooking(conn, id);
      if (!['ChoXacNhan', 'DaDat'].includes(booking.trang_thai)) throw createError('INVALID_STATUS_TRANSITION');
      const [room] = await lockRooms(conn, [booking.phong_id]);
      if (['DangO', 'DangDon', 'BaoTri'].includes(room.trang_thai)) throw createError('ROOM_NOT_AVAILABLE');
      await ensureSegment(conn, booking);
      await conn.execute("UPDATE DAT_PHONG SET trang_thai='DangO',thoi_gian_check_in_thuc=NOW(),nguoi_dung_id=? WHERE id=?", [user?.id ?? null, id]);
      await conn.execute("UPDATE PHONG SET trang_thai='DangO' WHERE id=?", [booking.phong_id]);
    });
    await auditLogService.log(user, 'check_in', `Nhận phòng #${id}`);
    return { success: true };
  },

  async checkOut(id, user) {
    const result = await withTransaction(async conn => {
      const booking = await lockBooking(conn, id);
      if (booking.trang_thai !== 'DangO') throw createError('BOOKING_NOT_CHECKED_IN');
      await lockRooms(conn, [booking.phong_id]);
      // Trả phòng trễ so với ngày check-out dự kiến → tự động cộng phụ phí theo cấu hình.
      let merged = booking;
      const today = hotelToday();
      if (today > dateOnly(booking.ngay_check_out) && !(Number(booking.phu_phi_tra_muon) > 0)) {
        const [config] = await conn.execute('SELECT phi_tra_muon FROM HOTEL_CONFIG WHERE id=1');
        const fee = Number(config[0]?.phi_tra_muon || 0);
        if (fee > 0) {
          await conn.execute('UPDATE DAT_PHONG SET phu_phi_tra_muon=? WHERE id=?', [fee, id]);
          merged = { ...booking, phu_phi_tra_muon: fee };
        }
      }
      await refreshInvoice(conn, merged);
      const [invoices] = await conn.execute('SELECT * FROM HOA_DON WHERE dat_phong_id=? FOR UPDATE', [id]);
      if (!invoices.length || invoices[0].trang_thai_thanh_toan !== 'DaThanhToan') throw createError('CHECKOUT_UNPAID');
      await conn.execute("UPDATE DAT_PHONG SET trang_thai='DaTra' WHERE id=?", [id]);
      await conn.execute("UPDATE PHONG SET trang_thai='DangDon' WHERE id=?", [booking.phong_id]);
      return { late_fee: Number(merged.phu_phi_tra_muon || 0) };
    });
    await auditLogService.log(user, 'check_out', `Trả phòng #${id}`);
    return { success: true, phu_phi_tra_muon: result.late_fee };
  },

  async markNoShow(id, user) {
    const result = await withTransaction(async conn => {
      const booking = await lockBooking(conn, id);
      if (!['ChoXacNhan', 'DaDat'].includes(booking.trang_thai)) throw createError('INVALID_STATUS_TRANSITION');
      const [config] = await conn.execute('SELECT * FROM HOTEL_CONFIG WHERE id=1');
      const deadline = new Date(`${dateOnly(booking.ngay_check_in)}T${config[0].check_in_time}:00+07:00`);
      if (new Date() < deadline) throw createError('NO_SHOW_TOO_EARLY');
      await lockRooms(conn, [booking.phong_id]);
      const policy = config[0].no_show_deposit_policy;
      // Chính sách Hoan → hoàn toàn bộ phần cọc chưa hoàn (US-19, US-28).
      let refunded = 0;
      if (policy === 'Hoan' && Number(booking.tien_coc) > Number(booking.tien_coc_da_hoan || 0)) {
        refunded = Number(booking.tien_coc) - Number(booking.tien_coc_da_hoan || 0);
        await conn.execute('UPDATE DAT_PHONG SET tien_coc_da_hoan=tien_coc WHERE id=?', [id]);
        await refreshInvoice(conn, { ...booking, tien_coc_da_hoan: booking.tien_coc });
      }
      await conn.execute("UPDATE DAT_PHONG SET trang_thai='NoShow',chinh_sach_coc=? WHERE id=?", [policy, id]);
      await refreshRoom(conn, booking.phong_id);
      return { success: true, chinh_sach_coc: policy, tien_coc_da_hoan: refunded };
    });
    await auditLogService.log(user, 'no_show', `Vắng mặt #${id}, chính sách cọc: ${result.chinh_sach_coc}, hoàn cọc: ${result.tien_coc_da_hoan}`);
    return result;
  },

  async transferRoom(id, newPhongId, user) {
    await withTransaction(async conn => {
      const booking = await lockBooking(conn, id);
      if (booking.trang_thai !== 'DangO') throw createError('BOOKING_NOT_CHECKED_IN');
      if (Number(booking.phong_id) === Number(newPhongId)) throw createError('ROOM_NOT_AVAILABLE');
      const rooms = await lockRooms(conn, [booking.phong_id, newPhongId]);
      const target = rooms.find(r => r.id === Number(newPhongId));
      if (['BaoTri', 'DangDon', 'DangO'].includes(target.trang_thai)) throw createError('ROOM_NOT_AVAILABLE');
      let transferDate = hotelToday();
      transferDate = transferDate < dateOnly(booking.ngay_check_in) ? dateOnly(booking.ngay_check_in) : transferDate;
      transferDate = transferDate > dateOnly(booking.ngay_check_out) ? dateOnly(booking.ngay_check_out) : transferDate;
      await assertAvailable(conn, newPhongId, transferDate, booking.ngay_check_out, id);
      await ensureSegment(conn, booking);
      await conn.execute('UPDATE LICH_SU_PHONG SET den_ngay=? WHERE dat_phong_id=? ORDER BY id DESC LIMIT 1', [transferDate, id]);
      await conn.execute('INSERT INTO LICH_SU_PHONG(dat_phong_id,phong_id,tu_ngay,den_ngay,don_gia) VALUES(?,?,?,?,?)', [id, newPhongId, transferDate, booking.ngay_check_out, target.gia_mac_dinh]);
      await conn.execute('UPDATE DAT_PHONG SET phong_id=? WHERE id=?', [newPhongId, id]);
      await conn.execute("UPDATE PHONG SET trang_thai='DangDon' WHERE id=?", [booking.phong_id]);
      await conn.execute("UPDATE PHONG SET trang_thai='DangO' WHERE id=?", [newPhongId]);
      await refreshInvoice(conn, { ...booking, phong_id: newPhongId });
    });
    await auditLogService.log(user, 'transfer_room', `Chuyển phòng #${id} sang phòng #${newPhongId}`);
    return { success: true };
  },

  async extendStay(id, newCheckOut, user, lateFee) {
    await withTransaction(async conn => {
      const booking = await lockBooking(conn, id);
      if (booking.trang_thai !== 'DangO') throw createError('BOOKING_NOT_CHECKED_IN');
      if (newCheckOut && dateOnly(newCheckOut) <= dateOnly(booking.ngay_check_out)) throw createError('VALIDATION_ERROR', { message: 'Ngày trả mới phải sau ngày trả hiện tại' });
      await lockRooms(conn, [booking.phong_id]);
      const merged = { ...booking, ngay_check_out: newCheckOut || booking.ngay_check_out };
      if (lateFee !== undefined && lateFee !== null) merged.phu_phi_tra_muon = Number(booking.phu_phi_tra_muon || 0) + Number(lateFee);
      await assertAvailable(conn, booking.phong_id, booking.ngay_check_in, merged.ngay_check_out, id, 'EXTEND_CONFLICT');
      await ensureSegment(conn, booking);
      await conn.execute('UPDATE DAT_PHONG SET ngay_check_out=?,phu_phi_tra_muon=? WHERE id=?', [merged.ngay_check_out, merged.phu_phi_tra_muon, id]);
      await conn.execute('UPDATE LICH_SU_PHONG SET den_ngay=? WHERE dat_phong_id=? ORDER BY id DESC LIMIT 1', [merged.ngay_check_out, id]);
      await refreshInvoice(conn, merged);
    });
    await auditLogService.log(user, 'extend_stay', `Gia hạn booking #${id} đến ${newCheckOut || ''}, phụ phí ${lateFee || 0}`);
    return { success: true };
  },

  async addService(id, serviceId, quantity, user) {
    const result = await withTransaction(async conn => {
      const booking = await lockBooking(conn, id);
      if (booking.trang_thai !== 'DangO') throw createError('BOOKING_NOT_CHECKED_IN');
      const [services] = await conn.execute('SELECT * FROM DICH_VU WHERE id=?', [serviceId]);
      if (!services.length) throw createError('NOT_FOUND');
      if (services[0].trang_thai !== 'Active') throw createError('SERVICE_INACTIVE');
      const amount = Number(services[0].don_gia) * quantity;
      const [r] = await conn.execute('INSERT INTO SU_DUNG_DICH_VU(dat_phong_id,dich_vu_id,so_luong,thanh_tien) VALUES(?,?,?,?)', [id, serviceId, quantity, amount]);
      await refreshInvoice(conn, booking);
      return { id: r.insertId, thanh_tien: amount };
    });
    await auditLogService.log(user, 'add_service', `Thêm dịch vụ #${serviceId} x${quantity} cho booking #${id}`);
    return result;
  },

  async removeService(id, sddvId, user) {
    await withTransaction(async conn => {
      const booking = await lockBooking(conn, id);
      if (booking.trang_thai !== 'DangO') throw createError('BOOKING_NOT_CHECKED_IN');
      const [r] = await conn.execute('DELETE FROM SU_DUNG_DICH_VU WHERE id=? AND dat_phong_id=?', [sddvId, id]);
      if (!r.affectedRows) throw createError('NOT_FOUND');
      await refreshInvoice(conn, booking);
    });
    await auditLogService.log(user, 'remove_service', `Xóa dịch vụ #${sddvId} khỏi booking #${id}`);
    return { success: true };
  },

  async applyPromo(id, code, user) {
    const result = await withTransaction(async conn => {
      const booking = await lockBooking(conn, id);
      if (user?.vai_tro === 'Customer' && Number(booking.khach_hang_id) !== Number(user.id)) {
        throw createError('PERMISSION_DENIED');
      }
      if (!['ChoXacNhan', 'DaDat', 'DangO'].includes(booking.trang_thai)) {
        throw createError('INVALID_STATUS_TRANSITION', { message: 'Chỉ áp dụng mã giảm giá cho đặt phòng chưa hoàn tất' });
      }
      const [promos] = await conn.execute('SELECT * FROM MA_GIAM_GIA WHERE ma=? FOR UPDATE', [code]);
      const promo = promos[0];
      if (!promo) throw createError('PROMO_INVALID', { message: 'Mã giảm giá không tồn tại' });
      if (promo.trang_thai !== 'Active') throw createError('PROMO_INVALID', { message: 'Mã giảm giá đã ngừng hoạt động' });
      const today = hotelToday();
      if (promo.ngay_bat_dau && today < dateOnly(promo.ngay_bat_dau)) {
        throw createError('PROMO_INVALID', { message: `Mã chỉ có hiệu lực từ ${dateOnly(promo.ngay_bat_dau)}` });
      }
      if (promo.ngay_ket_thuc && today > dateOnly(promo.ngay_ket_thuc)) {
        throw createError('PROMO_INVALID', { message: `Mã đã hết hạn ngày ${dateOnly(promo.ngay_ket_thuc)}` });
      }
      if (promo.gioi_han_su_dung != null && Number(promo.so_lan_da_dung) >= Number(promo.gioi_han_su_dung)) {
        throw createError('PROMO_INVALID', { message: 'Mã đã hết lượt sử dụng' });
      }
      const charges = await calculateCharges(conn, booking);
      if (promo.gia_tri_toi_thieu != null && (charges.tong_tien_phong + charges.tong_tien_dich_vu) < Number(promo.gia_tri_toi_thieu)) {
        throw createError('PROMO_INVALID', { message: `Đơn tối thiểu ${Number(promo.gia_tri_toi_thieu).toLocaleString('vi-VN')} ₫ để dùng mã này` });
      }
      const isNewApply = Number(booking.ma_giam_gia_id) !== Number(promo.id);
      await conn.execute('UPDATE DAT_PHONG SET ma_giam_gia_id=? WHERE id=?', [promo.id, id]);
      if (isNewApply) await conn.execute('UPDATE MA_GIAM_GIA SET so_lan_da_dung=so_lan_da_dung+1 WHERE id=?', [promo.id]);
      await refreshInvoice(conn, { ...booking, ma_giam_gia_id: promo.id });
      return { success: true, discount_percent: Number(promo.phan_tram) };
    });
    await auditLogService.log(user, 'apply_promo', `Áp dụng mã ${code} cho booking #${id}`);
    return result;
  },

  // Hoàn tiền cọc (US-28): số tiền hoàn không vượt quá phần cọc chưa hoàn.
  async refundDeposit(id, amount, reason, user) {
    const result = await withTransaction(async conn => {
      const booking = await lockBooking(conn, id);
      const refundable = Number(booking.tien_coc) - Number(booking.tien_coc_da_hoan || 0);
      if (refundable <= 0) throw createError('REFUND_EXCEEDS_COLLECTED', { message: 'Đặt phòng này không còn tiền cọc để hoàn' });
      const toRefund = amount != null ? Number(amount) : refundable;
      if (toRefund <= 0) throw createError('VALIDATION_ERROR', { message: 'Số tiền hoàn phải lớn hơn 0' });
      if (toRefund > refundable) throw createError('REFUND_EXCEEDS_COLLECTED', { message: 'Số tiền hoàn không được vượt quá tiền cọc chưa hoàn' });
      await conn.execute('UPDATE DAT_PHONG SET tien_coc_da_hoan=tien_coc_da_hoan+? WHERE id=?', [toRefund, id]);
      await refreshInvoice(conn, { ...booking, tien_coc_da_hoan: Number(booking.tien_coc_da_hoan || 0) + toRefund });
      return { success: true, refunded: toRefund };
    });
    await auditLogService.log(user, 'refund_deposit', `Hoàn cọc ${result.refunded} ₫ cho booking #${id}, lý do: ${reason}`);
    return result;
  },

  // Kiểm tra mã khuyến mãi trước khi đặt (website khách "Áp dụng", US-44).
  // Read-only: cùng quy tắc resolvePromoInTxn + giá trị tối thiểu, không trừ lượt.
  async validatePromo(code, amount) {
    const [promos] = await pool.execute('SELECT * FROM MA_GIAM_GIA WHERE ma=?', [code]);
    const promo = promos[0];
    if (!promo) throw createError('PROMO_INVALID', { message: 'Mã giảm giá không tồn tại' });
    if (promo.trang_thai !== 'Active') throw createError('PROMO_INVALID', { message: 'Mã giảm giá đã ngừng hoạt động' });
    const today = hotelToday();
    if (promo.ngay_bat_dau && today < dateOnly(promo.ngay_bat_dau)) {
      throw createError('PROMO_INVALID', { message: `Mã chỉ có hiệu lực từ ${dateOnly(promo.ngay_bat_dau)}` });
    }
    if (promo.ngay_ket_thuc && today > dateOnly(promo.ngay_ket_thuc)) {
      throw createError('PROMO_INVALID', { message: `Mã đã hết hạn ngày ${dateOnly(promo.ngay_ket_thuc)}` });
    }
    if (promo.gioi_han_su_dung != null && Number(promo.so_lan_da_dung) >= Number(promo.gioi_han_su_dung)) {
      throw createError('PROMO_INVALID', { message: 'Mã đã hết lượt sử dụng' });
    }
    if (promo.gia_tri_toi_thieu != null && amount != null && Number(amount) < Number(promo.gia_tri_toi_thieu)) {
      throw createError('PROMO_INVALID', { message: `Đơn tối thiểu ${Number(promo.gia_tri_toi_thieu).toLocaleString('vi-VN')} ₫ để dùng mã này` });
    }
    const percent = Number(promo.phan_tram);
    return {
      ma: promo.ma,
      phan_tram: percent,
      giam_gia: amount != null ? Math.round(Number(amount) * percent / 100) : null,
    };
  },

  async guestLookup(bookingCode, sdtOrEmail) {
    const bookingId = parseInt(bookingCode, 10);
    if (isNaN(bookingId) || bookingId <= 0) throw createError('NOT_FOUND');
    const [rows] = await pool.execute(
      `SELECT dp.id, dp.trang_thai, dp.ngay_check_in, dp.ngay_check_out, dp.tien_coc,
              dp.thoi_gian_check_in_thuc, dp.created_at,
              p.so_phong, lp.ten_loai_phong, lp.gia_mac_dinh,
              kh.ho_ten, kh.sdt, kh.email
       FROM DAT_PHONG dp
       JOIN PHONG p ON dp.phong_id = p.id
       JOIN LOAI_PHONG lp ON p.loai_phong_id = lp.id
       JOIN KHACH_HANG kh ON dp.khach_hang_id = kh.id
       WHERE dp.id = ? AND (kh.sdt = ? OR kh.email = ?)`,
      [bookingId, sdtOrEmail, sdtOrEmail]
    );
    if (rows.length === 0) throw createError('NOT_FOUND');
    const booking = rows[0];
    const services = await suDungDichVuRepository.findByBookingId(bookingId);
    const invoice = await hoaDonRepository.findByBookingId(bookingId);
    return { ...booking, services, invoice };
  },

  async calculateStayDays(id) {
    const booking = await datPhongRepository.findById(id);
    if (!booking) throw createError('NOT_FOUND');

    const checkIn = new Date(booking.ngay_check_in);
    const checkOut = new Date(booking.ngay_check_out);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw createError('VALIDATION_ERROR', { message: 'Ngày check-in hoặc check-out không hợp lệ' });
    }
    if (checkOut <= checkIn) {
      throw createError('VALIDATION_ERROR', { message: 'Ngày check-out phải sau ngày check-in' });
    }

    const soDem = daysBetween(booking.ngay_check_in, booking.ngay_check_out);
    const soNgayO = soDem + 1;
    const giaMoiDem = Number(booking.gia_mac_dinh || 0);
    const tienPhongUocTinh = soDem * giaMoiDem;

    const now = new Date();
    let soNgayDaO = 0;
    let soNgayConLai = soDem;
    if (booking.trang_thai === 'DangO' && booking.thoi_gian_check_in_thuc) {
      const realCheckIn = new Date(booking.thoi_gian_check_in_thuc);
      soNgayDaO = Math.max(0, daysBetween(realCheckIn, now));
      soNgayConLai = Math.max(0, soDem - soNgayDaO);
    } else if (booking.trang_thai === 'DaTra') {
      soNgayDaO = soDem;
      soNgayConLai = 0;
    }

    return {
      booking_id: booking.id,
      so_phong: booking.so_phong,
      ten_loai_phong: booking.ten_loai_phong,
      ten_khach: booking.ten_khach,
      trang_thai: booking.trang_thai,
      ngay_check_in: booking.ngay_check_in,
      ngay_check_out: booking.ngay_check_out,
      thoi_gian_check_in_thuc: booking.thoi_gian_check_in_thuc || null,
      so_dem: soDem,
      so_ngay_o: soNgayO,
      so_ngay_da_o: soNgayDaO,
      so_ngay_con_lai: soNgayConLai,
      gia_moi_dem: giaMoiDem,
      tien_phong_uoc_tinh: tienPhongUocTinh,
      tien_coc: Number(booking.tien_coc || 0),
    };
  },
};
