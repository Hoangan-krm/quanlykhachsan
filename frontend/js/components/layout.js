import { el, clear } from '../utils/dom.js';
import { authService } from '../services/auth.js';
import { ROLE_LABELS } from '../utils/format.js';
import { toast, openModal, closeModal } from './ui.js';

const NAV_ITEMS = [
  { section: 'Tổng quan', items: [
    { path: '#/dashboard', label: 'Dashboard', icon: '📊', roles: ['Admin', 'QuanLy', 'LeTan'] },
  ]},
  { section: 'Lễ tân', items: [
    { path: '#/bookings', label: 'Đặt phòng', icon: '📅', roles: ['Admin', 'QuanLy', 'LeTan'] },
    { path: '#/rooms', label: 'Phòng', icon: '🚪', roles: ['Admin', 'QuanLy', 'LeTan'] },
    { path: '#/customers', label: 'Khách hàng', icon: '👥', roles: ['Admin', 'QuanLy', 'LeTan'] },
    { path: '#/shifts', label: 'Ca làm việc', icon: '🕐', roles: ['Admin', 'QuanLy', 'LeTan'] },
    { path: '#/chat', label: 'Chat hỗ trợ', icon: '💬', roles: ['Admin', 'QuanLy', 'LeTan'] },
  ]},
  { section: 'Hóa đơn', items: [
    { path: '#/invoices', label: 'Hóa đơn', icon: '🧾', roles: ['Admin', 'QuanLy', 'LeTan'] },
    { path: '#/payments', label: 'Thanh toán', icon: '💰', roles: ['Admin', 'QuanLy', 'LeTan'] },
  ]},
  { section: 'Danh mục', items: [
    { path: '#/room-types', label: 'Loại phòng', icon: '🏷️', roles: ['Admin', 'QuanLy'] },
    { path: '#/services', label: 'Dịch vụ', icon: '🛎️', roles: ['Admin', 'QuanLy'] },
    { path: '#/promos', label: 'Mã giảm giá', icon: '🎫', roles: ['Admin', 'QuanLy'] },
  ]},
  { section: 'Báo cáo', items: [
    { path: '#/reports', label: 'Báo cáo', icon: '📈', roles: ['Admin', 'QuanLy'] },
    { path: '#/reviews', label: 'Đánh giá', icon: '⭐', roles: ['Admin', 'QuanLy'] },
    { path: '#/audit', label: 'Nhật ký', icon: '📋', roles: ['Admin', 'QuanLy'] },
  ]},
  { section: 'Hệ thống', items: [
    { path: '#/staff', label: 'Nhân viên', icon: '👤', roles: ['Admin'] },
    { path: '#/settings', label: 'Cấu hình', icon: '⚙️', roles: ['Admin'] },
    { path: '#/backup', label: 'Sao lưu', icon: '💾', roles: ['Admin'] },
  ]},
];

export function renderLayout(currentPath) {
  const user = authService.getUser();
  const role = authService.getRole();
  const app = document.getElementById('app');
  clear(app);

  const sidebar = el('aside', { class: 'sidebar', id: 'sidebar' });
  sidebar.appendChild(el('div', { class: 'sidebar-header' },
    el('span', { class: 'hotel-icon' }, '🏨'),
    el('h1', {}, 'Hotel Manager')
  ));
  const nav = el('nav', { class: 'sidebar-nav' });
  for (const group of NAV_ITEMS) {
    const visibleItems = group.items.filter(item => item.roles.includes(role));
    if (visibleItems.length === 0) continue;
    nav.appendChild(el('div', { class: 'sidebar-section' },
      el('div', { class: 'sidebar-section-title' }, group.section),
      ...visibleItems.map(item => {
        const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
        return el('a', { href: item.path, class: `sidebar-link ${isActive ? 'active' : ''}` },
          el('span', { class: 'icon' }, item.icon), el('span', {}, item.label)
        );
      })
    ));
  }
  sidebar.appendChild(nav);

  const mainArea = el('div', { class: 'main-area' });
  const header = el('header', { class: 'header' });
  header.appendChild(el('div', { class: 'header-left' },
    el('button', { class: 'sidebar-toggle', onclick: () => toggleSidebar() }, '☰'),
    el('span', { class: 'header-title', id: 'page-title' }, '')
  ));
  const userArea = el('div', { class: 'header-right' });
  userArea.appendChild(el('div', { class: 'header-user' },
    el('div', { class: 'header-user-info' },
      el('div', { class: 'header-user-name' }, user?.ho_ten || 'User'),
      el('div', { class: 'header-user-role' }, ROLE_LABELS[role] || role)
    ),
    el('div', { class: 'user-avatar' }, (user?.ho_ten || 'U').charAt(0).toUpperCase())
  ));
  const changePwBtn = el('button', { class: 'btn btn-secondary btn-sm' }, 'Đổi mật khẩu');
  changePwBtn.addEventListener('click', () => openChangePassword());
  userArea.appendChild(changePwBtn);
  const logoutBtn = el('button', { class: 'btn btn-secondary btn-sm' }, 'Đăng xuất');
  logoutBtn.addEventListener('click', async () => {
    await authService.logout();
    location.hash = '#/login';
  });
  userArea.appendChild(logoutBtn);
  header.appendChild(userArea);
  mainArea.appendChild(header);
  mainArea.appendChild(el('main', { class: 'page-content', id: 'page-content' }));

  const overlay = el('div', { class: 'mobile-overlay', id: 'mobile-overlay', onclick: () => toggleSidebar() });

  app.append(sidebar, overlay, mainArea);
  return document.getElementById('page-content');
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('mobile-overlay')?.classList.toggle('show');
}

// US-04: nhân viên tự đổi mật khẩu (bắt buộc nhập mật khẩu hiện tại).
function openChangePassword() {
  const body = el('form', { class: 'form', onsubmit: async (e) => {
    e.preventDefault();
    const current = body.querySelector('[name=current]').value;
    const next = body.querySelector('[name=next]').value;
    try {
      await authService.changePassword(current, next);
      toast('Đổi mật khẩu thành công. Hãy dùng mật khẩu mới ở lần đăng nhập sau.', 'success');
      closeModal();
    } catch (err) { toast(err.message, 'error'); }
  }},
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Mật khẩu hiện tại'),
      el('input', { class: 'form-input', type: 'password', name: 'current', required: true })),
    el('div', { class: 'form-group' },
      el('label', { class: 'form-label' }, 'Mật khẩu mới (ít nhất 8 ký tự, có chữ hoa và số)'),
      el('input', { class: 'form-input', type: 'password', name: 'next', required: true })),
    el('button', { class: 'btn btn-primary', type: 'submit', style: { width: '100%', justifyContent: 'center' } }, 'Cập nhật'));
  openModal('Đổi mật khẩu', body);
}

export function setPageTitle(title) {
  const el = document.getElementById('page-title');
  if (el) el.textContent = title;
}
