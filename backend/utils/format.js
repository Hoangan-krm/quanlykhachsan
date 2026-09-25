export function formatVND(amount) {
  if (amount === null || amount === undefined) return '0 ₫';
  const num = Number(amount);
  return num.toLocaleString('vi-VN') + ' ₫';
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatNumber(value) {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString('vi-VN');
}
