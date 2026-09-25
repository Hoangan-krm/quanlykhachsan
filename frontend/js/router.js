import { authService } from './services/auth.js';
import { renderLayout, setPageTitle } from './components/layout.js';
import { el, clear, showLoading } from './utils/dom.js';
import { toast } from './components/ui.js';

const routes = {};
const PUBLIC_PATHS = new Set(['/portal', '/customer-login', '/register', '/guest-booking', '/guest-lookup', '/verify-account', '/forgot-password']);
const CUSTOMER_PATHS = new Set(['/customer', '/customer/bookings', '/customer/profile', '/customer/chat']);

// Phân quyền theo route (US-03): UI không chỉ ẩn menu — điều hướng thẳng vào
// route trái phép cũng bị chặn ngay từ tầng router.
const STAFF_ROUTE_ROLES = {
  '/dashboard': ['Admin', 'QuanLy', 'LeTan'],
  '/bookings': ['Admin', 'QuanLy', 'LeTan'],
  '/rooms': ['Admin', 'QuanLy', 'LeTan'],
  '/customers': ['Admin', 'QuanLy', 'LeTan'],
  '/shifts': ['Admin', 'QuanLy', 'LeTan'],
  '/chat': ['Admin', 'QuanLy', 'LeTan'],
  '/invoices': ['Admin', 'QuanLy', 'LeTan'],
  '/payments': ['Admin', 'QuanLy', 'LeTan'],
  '/room-types': ['Admin', 'QuanLy'],
  '/services': ['Admin', 'QuanLy'],
  '/promos': ['Admin', 'QuanLy'],
  '/reports': ['Admin', 'QuanLy'],
  '/reviews': ['Admin', 'QuanLy'],
  '/audit': ['Admin', 'QuanLy'],
  '/staff': ['Admin'],
  '/settings': ['Admin'],
  '/backup': ['Admin'],
};

export function register(path, handler) { routes[path] = handler; }

function parseHash() {
  // Portal nhân viên tại /portal/ — khi không có hash, mặc định vào trang
  // đăng nhập nhân viên (#/login), KHÔNG phải trang chủ khách hàng (#/portal).
  // Điều này đảm bảo /portal/ là lối vào riêng cho nhân viên, tách biệt với
  // website khách hàng tại /.
  const hash = location.hash.slice(1) || '/login';
  const [path, queryStr] = hash.split('?');
  const query = {};
  if (queryStr) {
    for (const pair of queryStr.split('&')) {
      const [k, v] = pair.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  }
  return { path, query };
}

let sessionChecked = false;

export async function navigate() {
  const { path, query } = parseHash();
  const app = document.getElementById('app');

  if (path === '/login') {
    if (authService.isLoggedIn() && authService.getRole() !== 'Customer') { location.hash = '#/dashboard'; return; }
    if (authService.isLoggedIn()) { location.hash = '#/customer'; return; }
    return routes['/login']?.(app, query);
  }

  if (PUBLIC_PATHS.has(path)) return routes[path]?.(app, query);

  if (!authService.isLoggedIn()) {
    location.hash = CUSTOMER_PATHS.has(path) ? '#/customer-login' : '#/login';
    return;
  }

  // Re-validate the session once per page load so a stale/expired token
  // (or a revoked account) is cleared before the first API call renders.
  if (!sessionChecked && authService.getRole() !== 'Customer') {
    sessionChecked = true;
    try { await authService.me(); }
    catch { /* 401 already handled by api.js redirect */ }
  }

  if (authService.getRole() === 'Customer') {
    if (!CUSTOMER_PATHS.has(path)) { location.hash = '#/customer'; return; }
    return routes[path]?.(app, query);
  }

  const allowedRoles = STAFF_ROUTE_ROLES[path];
  if (allowedRoles && !allowedRoles.includes(authService.getRole())) {
    toast('Bạn không có quyền truy cập trang này', 'error');
    location.hash = '#/dashboard';
    return;
  }

  const handler = routes[path];
  if (!handler) {
    clear(app);
    app.appendChild(el('div', { class: 'empty-state', style: { marginTop: '100px' } },
      el('div', { class: 'icon' }, '🔍'), el('h2', {}, '404'), el('p', {}, `Không tìm thấy trang: ${path}`),
      el('a', { href: '#/dashboard', class: 'btn btn-primary', style: { marginTop: '16px' } }, 'Về Dashboard')
    ));
    return;
  }

  const content = renderLayout('#' + path);
  showLoading(content);
  try {
    await handler(content, query);
  } catch (err) {
    clear(content);
    content.appendChild(el('div', { class: 'error-state' },
      el('div', { class: 'icon' }, '⚠️'),
      el('h2', {}, 'Lỗi'),
      el('p', {}, err.message || 'Đã xảy ra lỗi'),
      el('button', { class: 'btn btn-primary', style: { marginTop: '16px' }, onclick: () => navigate() }, 'Thử lại')
    ));
  }
}

export function start() {
  window.addEventListener('hashchange', navigate);
  navigate();
}
