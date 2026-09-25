import { daysBetween } from '../utils/date.js';
import { createError } from '../utils/errors.js';

export const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export const dateOnly = value => typeof value === 'string' ? value.slice(0,10) : new Date(value.getTime() - value.getTimezoneOffset()*60000).toISOString().slice(0,10);
export const hotelToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
export const paymentStatus = (paid, due) => paid >= due ? 'DaThanhToan' : paid > 0 ? 'ThanhToanMotPhan' : 'ChuaThanhToan';

export async function lockBooking(conn, id) {
  const [rows] = await conn.execute('SELECT * FROM DAT_PHONG WHERE id=? FOR UPDATE', [id]);
  if (!rows.length) throw createError('NOT_FOUND');
  return rows[0];
}
export async function lockRooms(conn, ids) {
  const rooms = [];
  for (const id of [...new Set(ids.map(Number))].sort((a,b)=>a-b)) {
    const [rows] = await conn.execute('SELECT p.*, lp.gia_mac_dinh, lp.suc_chua, lp.ten_loai_phong FROM PHONG p JOIN LOAI_PHONG lp ON lp.id=p.loai_phong_id WHERE p.id=? FOR UPDATE', [id]);
    if (!rows.length) throw createError('NOT_FOUND');
    rooms.push(rows[0]);
  }
  return rooms;
}
export async function assertAvailable(conn, roomId, checkIn, checkOut, excludeId=0, error='ROOM_NOT_AVAILABLE') {
  const [rows] = await conn.execute("SELECT id FROM DAT_PHONG WHERE phong_id=? AND id<>? AND trang_thai IN ('ChoXacNhan','DaDat','DangO') AND ngay_check_in < ? AND ngay_check_out > ? FOR UPDATE", [roomId,excludeId,checkOut,checkIn]);
  if (rows.length) throw createError(error);
}
export async function refreshRoom(conn, id) {
  await conn.execute(`UPDATE PHONG SET trang_thai=CASE
    WHEN EXISTS(SELECT 1 FROM DAT_PHONG WHERE phong_id=? AND trang_thai='DangO') THEN 'DangO'
    WHEN EXISTS(SELECT 1 FROM DAT_PHONG WHERE phong_id=? AND trang_thai IN ('DaDat','ChoXacNhan')) THEN 'DaDat'
    ELSE 'Trong' END WHERE id=? AND trang_thai NOT IN ('BaoTri','DangDon')`, [id,id,id]);
}
export async function ensureSegment(conn, booking) {
  const [rows] = await conn.execute('SELECT id FROM LICH_SU_PHONG WHERE dat_phong_id=? LIMIT 1', [booking.id]);
  if (!rows.length) await conn.execute(`INSERT INTO LICH_SU_PHONG(dat_phong_id,phong_id,tu_ngay,den_ngay,don_gia)
    SELECT ?,p.id,?,?,lp.gia_mac_dinh FROM PHONG p JOIN LOAI_PHONG lp ON lp.id=p.loai_phong_id WHERE p.id=?`, [booking.id,booking.ngay_check_in,booking.ngay_check_out,booking.phong_id]);
}

// A promo counts as valid only when it is Active, today falls inside its window
// (when a window is configured) and its usage quota has not been exhausted.
export async function getValidPromo(conn, promoId) {
  const [rows] = await conn.execute('SELECT * FROM MA_GIAM_GIA WHERE id=?', [promoId]);
  const promo = rows[0];
  if (!promo) return null;
  if (promo.trang_thai !== 'Active') return null;
  const today = hotelToday();
  if (promo.ngay_bat_dau && today < dateOnly(promo.ngay_bat_dau)) return null;
  if (promo.ngay_ket_thuc && today > dateOnly(promo.ngay_ket_thuc)) return null;
  if (promo.gioi_han_su_dung != null && Number(promo.so_lan_da_dung) >= Number(promo.gioi_han_su_dung)) return null;
  return promo;
}

export async function calculateCharges(conn, booking, { vat = null } = {}) {
  const [configRows] = await conn.execute('SELECT * FROM HOTEL_CONFIG WHERE id=1');
  const [segments] = await conn.execute('SELECT ls.*,p.so_phong FROM LICH_SU_PHONG ls JOIN PHONG p ON p.id=ls.phong_id WHERE dat_phong_id=? ORDER BY ls.id', [booking.id]);
  const [services] = await conn.execute('SELECT s.*,d.ten_dich_vu FROM SU_DUNG_DICH_VU s JOIN DICH_VU d ON d.id=s.dich_vu_id WHERE dat_phong_id=?', [booking.id]);
  let roomTotal;
  if (segments.length) roomTotal=segments.reduce((sum,s)=>sum+Math.max(0,daysBetween(s.tu_ngay,s.den_ngay))*Number(s.don_gia),0);
  else { const [rooms]=await conn.execute('SELECT lp.gia_mac_dinh FROM PHONG p JOIN LOAI_PHONG lp ON lp.id=p.loai_phong_id WHERE p.id=?',[booking.phong_id]); roomTotal=daysBetween(booking.ngay_check_in,booking.ngay_check_out)*Number(rooms[0].gia_mac_dinh); }
  const serviceTotal=services.reduce((sum,s)=>sum+Number(s.thanh_tien),0)+Number(booking.phu_phi_tra_muon||0);
  const vatRate=vat ?? Number(configRows[0].vat);
  const tax=money((roomTotal+serviceTotal)*vatRate);
  const deposit=Number(booking.tien_coc||0)-Number(booking.tien_coc_da_hoan||0);
  let discount=0;
  if(booking.ma_giam_gia_id) { const promo=await getValidPromo(conn, booking.ma_giam_gia_id); discount=Number(promo?.phan_tram||0); }
  const gross=money(roomTotal+serviceTotal+tax);
  const total=money(Math.max(0,gross*(1-discount/100)-deposit));
  return { tong_tien_phong:money(roomTotal),tong_tien_dich_vu:money(serviceTotal),thue_vat:tax,tong_cong:total,tam_tinh_truoc_thue:money(gross*(1-discount/100)),tien_coc:deposit,phan_tram_giam:discount,phu_phi_tra_muon:Number(booking.phu_phi_tra_muon||0),services,segments };
}
export async function refreshInvoice(conn, booking) {
  const [rows]=await conn.execute('SELECT * FROM HOA_DON WHERE dat_phong_id=? FOR UPDATE',[booking.id]);
  if(!rows.length) return;
  const invoice=rows[0];
  const charges=await calculateCharges(conn,booking);
  const [paid]=await conn.execute('SELECT COALESCE(SUM(so_tien),0) total FROM THANH_TOAN WHERE hoa_don_id=?',[invoice.id]);
  await conn.execute('UPDATE HOA_DON SET tong_tien_phong=?,tong_tien_dich_vu=?,thue_vat=?,tong_cong=?,trang_thai_thanh_toan=? WHERE id=?',[charges.tong_tien_phong,charges.tong_tien_dich_vu,charges.thue_vat,charges.tong_cong,paymentStatus(Number(paid[0].total),charges.tong_cong),invoice.id]);
}
