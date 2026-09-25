export function formatCurrency(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0));
}

const HOTEL_TZ = 'Asia/Ho_Chi_Minh';

export function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleDateString('vi-VN', { timeZone: HOTEL_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  return d.toLocaleDateString('vi-VN', { timeZone: HOTEL_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }) + ' ' + d.toLocaleTimeString('vi-VN', { timeZone: HOTEL_TZ, hour: '2-digit', minute: '2-digit' });
}

// YYYY-MM-DD theo giờ khách sạn — dùng cho input[type=date] và hiển thị ngày ở (DATE columns về dạng ISO UTC)
export function vnDate(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(value).toLocaleDateString('en-CA', { timeZone: HOTEL_TZ });
}

export function formatTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function daysBetween(start, end) {
  if (!start || !end) return 0;
  const ms = new Date(end) - new Date(start);
  return Math.max(0, Math.ceil(ms / 86400000));
}

export const ROOM_STATUS = {
  Trong: { label: 'Trống', class: 'badge-success', dot: 'var(--color-success)' },
  DaDat: { label: 'Đã đặt', class: 'badge-warning', dot: 'var(--color-warning)' },
  DangO: { label: 'Đang ở', class: 'badge-danger', dot: 'var(--color-danger)' },
  DangDon: { label: 'Đang dọn', class: 'badge-info', dot: 'var(--color-info)' },
  BaoTri: { label: 'Bảo trì', class: 'badge-muted', dot: 'var(--color-text-muted)' },
};

export const BOOKING_STATUS = {
  ChoXacNhan: { label: 'Chờ xác nhận', class: 'badge-warning' },
  DaDat: { label: 'Đã đặt', class: 'badge-primary' },
  DangO: { label: 'Đang ở', class: 'badge-danger' },
  DaTra: { label: 'Đã trả', class: 'badge-success' },
  Huy: { label: 'Đã hủy', class: 'badge-muted' },
  NoShow: { label: 'Vắng mặt', class: 'badge-muted' },
};

export const PAYMENT_STATUS = {
  ChuaThanhToan: { label: 'Chưa thanh toán', class: 'badge-danger' },
  ThanhToanMotPhan: { label: 'Thanh toán một phần', class: 'badge-warning' },
  DaThanhToan: { label: 'Đã thanh toán', class: 'badge-success' },
};

export const PAYMENT_METHOD = {
  TienMat: 'Tiền mặt',
  ChuyenKhoan: 'Chuyển khoản',
  The: 'Thẻ',
};

export const ROLE_LABELS = {
  Admin: 'Quản trị viên',
  QuanLy: 'Quản lý',
  LeTan: 'Lễ tân',
  Customer: 'Khách hàng',
};

export function badge(status, map) {
  const info = map[status] || { label: status, class: 'badge-muted' };
  return `<span class="badge ${info.class}">${info.label}</span>`;
}
