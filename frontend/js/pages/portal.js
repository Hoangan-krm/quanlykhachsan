import { api } from '../services/api.js';
import { authService } from '../services/auth.js';
import { renderGuestLookup } from './guestLookup.js';
import { el, clear } from '../utils/dom.js';
import { t, langSwitcher } from '../utils/i18n.js';
import { formatCurrency, BOOKING_STATUS, PAYMENT_STATUS, vnDate } from '../utils/format.js';

let hotelConfig = null;
async function getConfig() {
  if (!hotelConfig) {
    try { hotelConfig = (await api.get('/config/public')).data; }
    catch { hotelConfig = { ten_khach_san: 'Khách Sạn Hoàng An' }; }
  }
  return hotelConfig;
}

function statusPill(status) {
  const info = BOOKING_STATUS[status] || { label: status, class: 'badge-muted' };
  return el('span', { class: `badge ${info.class} status-pill` }, t(info.label));
}

async function shell(container, content, active = '') {
  const config = await getConfig();
  const user = authService.getUser();
  clear(container);
  container.append(el('div', { class: 'portal-shell' },
    el('header', { class: 'portal-header' },
      el('a', { class: 'portal-brand', href: '#/portal' }, (config.ten_khach_san || 'HOÀNG ÂN').toUpperCase(), el('small', {}, 'HOTEL')),
      el('nav', { class: 'portal-nav', 'aria-label': 'Điều hướng khách hàng' },
        el('a', { href: '#/portal', class: active === 'home' ? 'active' : '' }, t('Phòng')),
        el('a', { href: '#/guest-booking', class: active === 'book' ? 'active' : '' }, t('Đặt phòng')),
        el('a', { href: '#/guest-lookup', class: active === 'lookup' ? 'active' : '' }, t('Tra cứu')),
        user && authService.getRole() === 'Customer'
          ? el('a', { href: '#/customer' }, t('Tài khoản'))
          : el('a', { href: '#/customer-login' }, t('Đăng nhập')),
        langSwitcher()
      )
    ),
    el('main', { class: 'portal-main' }, content),
    el('footer', { class: 'portal-footer' }, `${config.ten_khach_san || 'Khách sạn'} · ${config.dia_chi || ''} · ${t('Đặt phòng trực tuyến an toàn')}`)
  ));
  return content;
}

function field(label, name, type = 'text', required = true, attrs = {}) {
  return el('label', { class: 'portal-field' }, el('span', {}, t(label)),
    el('input', { name, type, required, autocomplete: 'off', ...attrs }));
}

function message(target, text, error = false) {
  target.textContent = text;
  target.className = 'portal-message ' + (error ? 'error' : 'success');
}

// ---------- Trang chủ ----------
export async function renderPortal(container) {
  const body = el('div', {},
    el('section', { class: 'portal-hero' },
      el('div', {}, el('p', { class: 'eyebrow' }, t('TRẢI NGHIỆM NGHỈ DƯỠNG')),
        el('h1', {}, t('Một kỳ nghỉ nhẹ nhàng bắt đầu từ đây')),
        el('p', {}, t('Khám phá loại phòng, kiểm tra phòng trống và đặt phòng trong vài phút.'))),
      el('a', { class: 'btn btn-primary', href: '#/guest-booking' }, t('Kiểm tra phòng trống'))
    ),
    el('section', { class: 'portal-section' }, el('h2', {}, t('Loại phòng')),
      el('div', { class: 'portal-room-grid', id: 'public-room-types' }, el('div', { class: 'loading-state' }, el('div', { class: 'spinner' }))))
  );
  await shell(container, body, 'home');
  const grid = document.getElementById('public-room-types');
  try {
    const response = await api.get('/room-types');
    const rooms = response.data?.items || response.data || [];
    clear(grid);
    rooms.forEach(room => grid.append(el('article', { class: 'portal-room-card' },
      room.hinh_anh ? el('img', { src: room.hinh_anh, alt: room.ten_loai_phong || 'Loại phòng' }) : el('div', { class: 'room-placeholder' }, '🏨'),
      el('div', { class: 'room-card-body' },
        el('h3', {}, room.ten_loai_phong || 'Loại phòng'),
        el('p', {}, room.mo_ta || 'Không gian tiện nghi và thoải mái.'),
        el('div', { class: 'room-card-meta' },
          el('strong', {}, formatCurrency(room.gia_mac_dinh) + t(' / đêm')),
          el('span', { class: 'badge badge-muted' }, `👤 ${room.suc_chua || 2} ${t('khách')}`)),
        el('a', { class: 'btn btn-primary', href: '#/guest-booking' }, t('Đặt ngay'))
      )
    )));
    if (!rooms.length) grid.textContent = 'Chưa có loại phòng được công bố.';
  } catch (error) { grid.textContent = error.message; }
}

// ---------- Xác thực ----------
export function renderCustomerLogin(container) {
  const status = el('div', { class: 'portal-message', role: 'status' });
  const form = el('form', { class: 'portal-form' },
    el('h1', {}, t('Đăng nhập khách hàng')),
    field('Email', 'email', 'email'), field('Mật khẩu', 'password', 'password'),
    el('button', { class: 'btn btn-primary', type: 'submit' }, t('Đăng nhập')),
    status,
    el('div', { class: 'portal-form-links' },
      el('a', { href: '#/forgot-password' }, t('Quên mật khẩu?')),
      el('span', {}, t('Chưa có tài khoản? '), el('a', { href: '#/register' }, t('Đăng ký'))))
  );
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const data = new FormData(form);
      await authService.customerLogin(data.get('email'), data.get('password'));
      location.hash = '#/customer';
    } catch (error) {
      message(status, error.message, true);
    } finally { button.disabled = false; }
  });
  shell(container, el('section', { class: 'portal-auth' }, form));
}

export function renderRegister(container) {
  const status = el('div', { class: 'portal-message', role: 'status' });
  const form = el('form', { class: 'portal-form' },
    el('h1', {}, t('Tạo tài khoản')),
    field('Họ và tên', 'ho_ten'), field('Email', 'email', 'email'),
    field('Số điện thoại', 'sdt', 'tel'), field('CCCD / Passport', 'cccd_passport'),
    field('Mật khẩu (ít nhất 8 ký tự, có chữ hoa và số)', 'password', 'password'),
    el('button', { class: 'btn btn-primary', type: 'submit' }, t('Đăng ký')), status
  );
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      const res = await api.post('/customers/register', data);
      clear(form);
      form.append(el('h1', {}, 'Đăng ký thành công!'),
        el('p', {}, 'Tài khoản của bạn đã sẵn sàng. Bạn có thể đăng nhập ngay bây giờ.'),
        el('a', { class: 'btn btn-primary', href: '#/customer-login' }, t('Đăng nhập')));
    } catch (error) { message(status, error.message, true); }
  });
  shell(container, el('section', { class: 'portal-auth' }, form));
}

export async function renderVerifyAccount(container) {
  const params = new URLSearchParams((location.hash.split('?')[1] || ''));
  const token = params.get('token') || '';
  const body = el('section', { class: 'portal-auth' }, el('div', { class: 'loading-state' }, el('div', { class: 'spinner' })));
  await shell(container, body);
  try {
    await api.post('/customers/verify-account', { token });
    clear(body);
    body.append(el('h1', {}, 'Xác thực thành công 🎉'),
      el('p', {}, 'Tài khoản của bạn đã được kích hoạt. Hãy đăng nhập để đặt phòng.'),
      el('a', { class: 'btn btn-primary', href: '#/customer-login' }, t('Đăng nhập')));
  } catch (error) {
    clear(body);
    body.append(el('h1', {}, 'Xác thực không thành công'), el('p', {}, error.message),
      el('a', { class: 'btn btn-secondary', href: '#/customer-login' }, t('Đăng nhập')));
  }
}

export function renderForgotPassword(container) {
  const status = el('div', { class: 'portal-message', role: 'status' });
  const form = el('form', { class: 'portal-form' },
    el('h1', {}, 'Khôi phục mật khẩu'),
    el('p', {}, 'Nhập email tài khoản, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.'),
    field('Email', 'email', 'email'),
    el('button', { class: 'btn btn-primary', type: 'submit' }, 'Gửi liên kết'), status);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      await api.post('/auth/forgot-password', { email: new FormData(form).get('email') });
      message(status, 'Nếu email tồn tại trong hệ thống, liên kết khôi phục đã được gửi.');
    } catch (error) { message(status, error.message, true); }
  });
  shell(container, el('section', { class: 'portal-auth' }, form));
}

// ---------- Đặt phòng công khai ----------
export function renderGuestBooking(container) {
  const results = el('div', { class: 'portal-room-grid' });
  const status = el('div', { class: 'portal-message', role: 'status' });
  const search = el('form', { class: 'portal-search' },
    field('Nhận phòng', 'checkin', 'date'), field('Trả phòng', 'checkout', 'date'),
    el('button', { class: 'btn btn-primary', type: 'submit' }, t('Tìm phòng'))
  );
  search.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(search);
    const checkin = data.get('checkin');
    const checkout = data.get('checkout');
    if (!checkin || !checkout) return message(status, 'Vui lòng chọn ngày nhận và trả phòng.', true);
    if (checkout <= checkin) return message(status, t('Ngày trả phòng phải sau ngày nhận phòng.'), true);
    try {
      const response = await api.get('/rooms/vacant?check_in=' + encodeURIComponent(checkin) + '&check_out=' + encodeURIComponent(checkout));
      const rooms = response.data?.items || response.data || [];
      clear(results);
      rooms.forEach(room => {
        const book = el('button', { class: 'btn btn-primary', type: 'button' }, t('Đặt ngay'));
        book.addEventListener('click', () => showGuestDetails(container, room, checkin, checkout));
        results.appendChild(el('article', { class: 'portal-room-card compact' },
          el('div', { class: 'room-card-body' }, el('h3', {}, 'Phòng ' + room.so_phong),
            el('p', {}, room.ten_loai_phong || ''),
            el('strong', {}, formatCurrency(room.gia_mac_dinh) + t(' / đêm')), book)));
      });
      if (!rooms.length) results.textContent = t('Không còn phòng phù hợp trong thời gian đã chọn.');
    } catch (error) { message(status, error.message, true); }
  });
  shell(container, el('section', { class: 'portal-section' }, el('h1', {}, t('Đặt phòng trực tuyến')), search, status, results), 'book');
}

function showGuestDetails(container, room, checkin, checkout) {
  const status = el('div', { class: 'portal-message', role: 'status' });
  const form = el('form', { class: 'portal-form' }, el('h1', {}, t('Thông tin người đặt')),
    el('p', { class: 'portal-summary' }, 'Phòng ' + room.so_phong + ' · ' + checkin + ' → ' + checkout + ' · ' + formatCurrency(room.gia_mac_dinh) + '/đêm'),
    field('Họ và tên', 'ho_ten'), field('Số điện thoại', 'sdt', 'tel'),
    field('Email (không bắt buộc)', 'email', 'email', false),
    field('Số lượng khách', 'so_khach', 'number', true, { min: 1, max: room.suc_chua || 10, value: 1 }),
    field('Mã khuyến mãi (nếu có)', 'ma_km', 'text', false),
    el('button', { class: 'btn btn-primary', type: 'submit' }, t('Xác nhận đặt phòng')), status);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (!data.email) delete data.email;
    if (!data.ma_km) delete data.ma_km;
    try {
      const response = await api.post('/bookings/guest', {
        ...data, so_khach: Number(data.so_khach || 1), phong_id: Number(room.id), ngay_check_in: checkin, ngay_check_out: checkout, tien_coc: 0
      });
      clear(form);
      form.append(el('h1', {}, t('Đặt phòng thành công')),
        el('p', {}, t('Mã đặt phòng') + ': #' + response.data.id),
        el('p', {}, 'Vui lòng lưu lại mã đặt phòng để tra cứu hoặc thanh toán.'),
        el('a', { class: 'btn btn-primary', href: '#/guest-lookup' }, t('Tra cứu đặt phòng')));
    } catch (error) { message(status, error.message, true); }
  });
  shell(container, el('section', { class: 'portal-auth' }, form), 'book');
}

export function renderLookup(container) {
  const body = el('section', { class: 'portal-auth' });
  shell(container, body, 'lookup');
  renderGuestLookup(body);
}

// ---------- Khu vực khách hàng ----------
function customerShell(container, title, content) {
  const user = authService.getUser();
  const logout = el('button', { type: 'button', class: 'btn btn-secondary' }, t('Đăng xuất'));
  logout.addEventListener('click', async () => { await authService.logout(); location.hash = '#/portal'; });
  return shell(container, el('section', { class: 'portal-section' },
    el('div', { class: 'customer-heading' }, el('div', {}, el('h1', {}, title), el('p', {}, 'Xin chào, ' + (user?.ho_ten || 'quý khách'))), logout),
    el('nav', { class: 'customer-tabs' },
      el('a', { href: '#/customer' }, t('Tổng quan')), el('a', { href: '#/customer/bookings' }, t('Đặt phòng')),
      el('a', { href: '#/customer/profile' }, t('Hồ sơ')), el('a', { href: '#/customer/chat' }, t('Hỗ trợ'))),
    content));
}

function canModify(row) {
  return ['ChoXacNhan', 'DaDat'].includes(row.trang_thai) &&
    (new Date(row.ngay_check_in).getTime() - Date.now()) >= 24 * 60 * 60 * 1000;
}

// Modal đánh giá (US-45): chỉ đặt phòng DaTra mới thấy nút này.
function openReviewModal(row, onDone) {
  const backdrop = el('div', { class: 'portal-modal-backdrop' });
  const stars = el('div', { class: 'star-picker' });
  let picked = 5;
  const renderStars = () => clear(stars).append(...[1, 2, 3, 4, 5].map(i =>
    el('button', { type: 'button', class: i <= picked ? 'star active' : 'star', onclick: () => { picked = i; renderStars(); } }, '★')));
  renderStars();
  const textarea = el('textarea', { name: 'noi_dung', rows: 4, placeholder: 'Chia sẻ trải nghiệm của bạn…' });
  const status = el('div', { class: 'portal-message' });
  const close = () => backdrop.remove();
  const modal = el('div', { class: 'portal-modal' },
    el('h3', {}, 'Đánh giá kỳ nghỉ #' + row.id),
    stars, textarea, status,
    el('div', { class: 'portal-modal-actions' },
      el('button', { class: 'btn btn-secondary', type: 'button', onclick: close }, 'Hủy'),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: async () => {
        try {
          await api.post('/reviews', { dat_phong_id: Number(row.id), so_sao: picked, noi_dung: textarea.value || undefined });
          close(); onDone?.();
        } catch (error) { message(status, error.message, true); }
      } }, 'Gửi đánh giá')));
  backdrop.append(modal);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  document.body.appendChild(backdrop);
}

// Modal sửa đặt phòng (US-43)
function openEditModal(row, onDone) {
  const backdrop = el('div', { class: 'portal-modal-backdrop' });
  const status = el('div', { class: 'portal-message' });
  const close = () => backdrop.remove();
  const form = el('form', { class: 'portal-form' },
    el('h3', {}, 'Sửa đặt phòng #' + row.id),
    field('Ngày nhận phòng', 'ngay_check_in', 'date', true, { value: vnDate(row.ngay_check_in) }),
    field('Ngày trả phòng', 'ngay_check_out', 'date', true, { value: vnDate(row.ngay_check_out) }),
    field('Số lượng khách', 'so_khach', 'number', true, { min: 1, max: 10, value: row.so_khach || 1 }),
    status,
    el('div', { class: 'portal-modal-actions' },
      el('button', { class: 'btn btn-secondary', type: 'button', onclick: close }, t('Hủy')),
      el('button', { class: 'btn btn-primary', type: 'submit' }, 'Lưu')));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    if (data.ngay_check_out <= data.ngay_check_in) return message(status, t('Ngày trả phòng phải sau ngày nhận phòng.'), true);
    try {
      await api.put('/customers/me/bookings/' + row.id, { ngay_check_in: data.ngay_check_in, ngay_check_out: data.ngay_check_out, so_khach: Number(data.so_khach) });
      close(); onDone?.();
    } catch (error) { message(status, error.message, true); }
  });
  backdrop.append(form);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
  document.body.appendChild(backdrop);
}

// Thanh toán online (US-40): Stripe.js Elements với publishable key công khai.
async function openOnlinePayment(row, reload) {
  const config = await getConfig();
  const invoice = row.invoice;
  const paid = Number(row.tong_da_thanh_toan || 0);
  const due = Number(invoice?.tong_cong || 0) - paid;
  const backdrop = el('div', { class: 'portal-modal-backdrop' });
  const status = el('div', { class: 'portal-message' });
  const close = () => backdrop.remove();
  const amountInput = el('input', { type: 'number', min: 10000, max: due, value: due, step: 1 });
  const cardDiv = el('div', { id: 'stripe-card-element' });
  const payBtn = el('button', { class: 'btn btn-primary', type: 'button' }, 'Thanh toán');
  const modal = el('div', { class: 'portal-modal' },
    el('h3', {}, 'Thanh toán online'),
    el('p', {}, invoice ? `Hóa đơn #${invoice.id} · Còn phải thu: ${formatCurrency(due)}` : 'Chưa có hóa đơn cho đặt phòng này.'),
    el('label', { class: 'portal-field' }, el('span', {}, 'Số tiền (₫)'), amountInput),
    cardDiv, status,
    el('div', { class: 'portal-modal-actions' },
      el('button', { class: 'btn btn-secondary', type: 'button', onclick: close }, t('Hủy')), payBtn));
  backdrop.append(modal);
  document.body.appendChild(backdrop);

  if (!config.stripe_publishable_key) {
    status.textContent = 'Cổng thanh toán online chưa được cấu hình. Vui lòng liên hệ lễ tân để thanh toán trực tiếp.';
    payBtn.remove();
    return;
  }
  const { loadStripe } = await import('https://js.stripe.com/v3/bundle/stripe.mjs');
  const stripe = loadStripe(config.stripe_publishable_key);
  const stripeInstance = await stripe;
  const elements = stripeInstance.elements();
  const card = elements.create('card');
  card.mount(cardDiv);

  payBtn.addEventListener('click', async () => {
    payBtn.disabled = true;
    try {
      const res = await api.post('/payments/online', { booking_id: Number(row.id), amount: Number(amountInput.value) });
      const { client_secret } = res.data;
      const result = await stripeInstance.confirmCardPayment(client_secret, { payment_method: { card, billing_details: {} } });
      if (result.error) { message(status, result.error.message, true); payBtn.disabled = false; return; }
      message(status, 'Thanh toán thành công! Cảm ơn quý khách.');
      setTimeout(() => { close(); reload?.(); }, 1200);
    } catch (error) { message(status, error.message, true); payBtn.disabled = false; }
  });
}

function bookingCard(row, reload) {
  const nights = Math.max(1, Math.ceil((new Date(row.ngay_check_out) - new Date(row.ngay_check_in)) / 86400000));
  const status = el('div', { class: 'booking-actions' });
  if (canModify(row)) {
    const edit = el('button', { class: 'btn btn-secondary btn-sm' }, t('Sửa'));
    edit.addEventListener('click', () => openEditModal(row, reload));
    const cancel = el('button', { class: 'btn btn-danger btn-sm' }, t('Hủy'));
    cancel.addEventListener('click', async () => {
      if (!confirm('Bạn chắc chắn muốn hủy đặt phòng #' + row.id + '?')) return;
      try { await api.post('/customers/me/bookings/' + row.id + '/cancel'); reload(); }
      catch (error) { alert(error.message); }
    });
    status.append(edit, cancel);
  }
  if (row.trang_thai === 'DaTra' && !row.reviewed) {
    const review = el('button', { class: 'btn btn-primary btn-sm' }, t('Đánh giá'));
    review.addEventListener('click', () => openReviewModal(row, reload));
    status.append(review);
  }
  const invoiceInfo = row.invoice
    ? `${PAYMENT_STATUS[row.invoice.trang_thai_thanh_toan]?.label || ''} · Tổng: ${formatCurrency(row.invoice.tong_cong)}`
    : 'Chưa có hóa đơn';
  const card = el('article', { class: 'booking-row' },
    el('div', { class: 'booking-row-head' },
      el('strong', {}, '#' + row.id + ' · ' + (row.ten_loai_phong ? row.ten_loai_phong : ('Phòng ' + row.so_phong))),
      statusPill(row.trang_thai)),
    el('div', { class: 'booking-row-meta' },
      el('span', {}, '📅 ' + vnDate(row.ngay_check_in) + ' → ' + vnDate(row.ngay_check_out)),
      el('span', {}, `🌙 ${nights} đêm · 👤 ${row.so_khach || 1} khách`),
      el('span', {}, invoiceInfo)),
    status);
  if (row.invoice && row.invoice.trang_thai_thanh_toan !== 'DaThanhToan' && !['Huy', 'NoShow', 'DaTra'].includes(row.trang_thai)) {
    const pay = el('button', { class: 'btn btn-primary btn-sm' }, t('Thanh toán online'));
    pay.addEventListener('click', () => openOnlinePayment(row, reload));
    status.append(pay);
  }
  return card;
}

export async function renderCustomerHome(container) {
  const content = el('div', { class: 'portal-panel' }, el('div', { class: 'loading-state' }, el('div', { class: 'spinner' })));
  await customerShell(container, t('Tài khoản'), content);
  try {
    const response = await api.get('/customers/me/bookings');
    const rows = response.data?.items || response.data || [];
    const upcoming = rows.filter(r => ['ChoXacNhan', 'DaDat', 'DangO'].includes(r.trang_thai));
    const past = rows.filter(r => ['DaTra', 'Huy', 'NoShow'].includes(r.trang_thai));
    clear(content);
    content.append(el('div', { class: 'portal-stats' },
      el('div', { class: 'portal-stat' }, el('strong', {}, String(upcoming.length)), el('span', {}, 'Chuyến sắp tới')),
      el('div', { class: 'portal-stat' }, el('strong', {}, String(past.length)), el('span', {}, 'Lần đã lưu trú')),
      el('div', { class: 'portal-stat' }, el('strong', {}, String(rows.length)), el('span', {}, 'Tổng đặt phòng'))));
    content.append(el('a', { href: '#/customer/bookings', class: 'btn btn-primary' }, t('Xem chi tiết')));
  } catch (error) { content.textContent = error.message; }
}

export async function renderCustomerBookings(container) {
  const content = el('div', { class: 'portal-panel' }, el('div', { class: 'loading-state' }, el('div', { class: 'spinner' })));
  await customerShell(container, t('Lịch sử đặt phòng'), content);
  const reload = () => renderCustomerBookings(container);
  try {
    const response = await api.get('/customers/me/bookings');
    const rows = response.data?.items || response.data || [];
    clear(content);
    if (!rows.length) { content.textContent = t('Bạn chưa có đặt phòng.'); return; }
    rows.sort((a, b) => new Date(b.created_at || b.id) - new Date(a.created_at || a.id));
    rows.forEach(row => content.append(bookingCard(row, reload)));
  } catch (error) { content.textContent = error.message; }
}

export async function renderCustomerProfile(container) {
  const status = el('div', { class: 'portal-message', role: 'status' });
  const form = el('form', { class: 'portal-form' }, el('h2', {}, t('Thông tin cá nhân')),
    field('Họ và tên', 'ho_ten'), field('Số điện thoại', 'sdt', 'tel'),
    field('Email', 'email', 'email'), field('CCCD / Passport', 'cccd_passport'),
    el('button', { class: 'btn btn-primary', type: 'submit' }, t('Lưu thay đổi')), status);
  const pwStatus = el('div', { class: 'portal-message', role: 'status' });
  const pwForm = el('form', { class: 'portal-form' }, el('h2', {}, t('Đổi mật khẩu')),
    field('Mật khẩu hiện tại', 'currentPassword', 'password'),
    field('Mật khẩu mới', 'newPassword', 'password'),
    el('button', { class: 'btn btn-secondary', type: 'submit' }, 'Cập nhật mật khẩu'), pwStatus);
  await customerShell(container, t('Hồ sơ'), el('div', { class: 'portal-two-col' }, form, pwForm));
  try {
    const response = await api.get('/customers/me');
    Object.entries(response.data || {}).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value || ''; });
  } catch (error) { message(status, error.message, true); }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    try { await api.put('/customers/me', Object.fromEntries(new FormData(form))); message(status, 'Đã lưu thông tin.'); }
    catch (error) { message(status, error.message, true); }
  });
  pwForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(pwForm));
    try {
      await api.put('/customers/me/password', { currentPassword: data.currentPassword, newPassword: data.newPassword });
      message(pwStatus, 'Đổi mật khẩu thành công.');
      pwForm.reset();
    } catch (error) { message(pwStatus, error.message, true); }
  });
}

export async function renderCustomerChat(container) {
  const messages = el('div', { class: 'chat-list' }, el('div', { class: 'loading-state' }, el('div', { class: 'spinner' })));
  const status = el('div', { class: 'portal-message', role: 'status' });
  const form = el('form', { class: 'chat-form' }, el('input', { name: 'noi_dung', required: true, placeholder: t('Nhập câu hỏi…') }),
    el('button', { class: 'btn btn-primary', type: 'submit' }, t('Gửi')));
  const content = el('div', { class: 'portal-panel' }, messages, form, status);
  await customerShell(container, t('Hỗ trợ trực tuyến'), content);
  let pollTimer = null;
  const load = async () => {
    try {
      const response = await api.get('/chat/messages');
      const conversation = response.data?.conversation;
      const rows = response.data?.messages || [];
      clear(messages);
      rows.forEach(row => messages.appendChild(el('div', { class: 'chat-message ' + (row.sender_role === 'Customer' ? 'mine' : '') }, row.noi_dung)));
      messages.scrollTop = messages.scrollHeight;
      if (conversation) await api.post(`/chat/conversations/${conversation.id}/mark-read`).catch(() => {});
    } catch (error) { message(status, error.message, true); }
  };
  await load();
  pollTimer = setInterval(load, 5000);
  window.addEventListener('hashchange', () => clearInterval(pollTimer), { once: true });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const input = form.elements.noi_dung;
    try { await api.post('/chat/messages', { noi_dung: input.value }); input.value = ''; await load(); }
    catch (error) { message(status, error.message, true); }
  });
}
