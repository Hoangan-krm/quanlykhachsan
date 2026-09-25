import { el, clear } from '../utils/dom.js';
import { authService } from '../services/auth.js';
import { toast } from '../components/ui.js';

export async function renderLogin(container) {
  clear(container);
  // Nhận ?reset=<token> từ email khôi phục mật khẩu để hiện form đặt lại.
  const params = new URLSearchParams((location.hash.split('?')[1] || ''));
  const resetToken = params.get('reset');

  let card;
  if (resetToken) {
    card = el('div', { class: 'login-page' },
      el('div', { class: 'login-card' },
        el('div', { class: 'login-header' }, el('h1', {}, '🔑 Đặt lại mật khẩu')),
        el('form', { class: 'login-form', onsubmit: async (e) => {
          e.preventDefault();
          const password = form.querySelector('[name=password]').value;
          const btn = form.querySelector('button[type=submit]');
          btn.disabled = true;
          try {
            await authService.resetPassword(resetToken, password);
            toast('Đặt lại mật khẩu thành công, hãy đăng nhập', 'success');
            location.hash = '#/login';
          } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
        }},
          el('div', { class: 'form-group' },
            el('label', { class: 'form-label' }, 'Mật khẩu mới (ít nhất 8 ký tự, có chữ hoa và số)'),
            el('input', { class: 'form-input', type: 'password', name: 'password', required: true })),
          el('button', { class: 'btn btn-primary', type: 'submit', style: { width: '100%', justifyContent: 'center' } }, 'Xác nhận')),
        el('div', { class: 'login-footer' }, el('a', { href: '#/login' }, '← Về trang đăng nhập'))));
    container.appendChild(card);
    return;
  }

  // Tài khoản nhân viên demo — hiển thị để người dùng biết thông tin đăng nhập.
  const demoAccounts = [
    { label: 'Admin', email: 'admin@hoangan.vn', password: 'admin123' },
    { label: 'Quản lý', email: 'manager@hoangan.vn', password: 'manager123' },
    { label: 'Lễ tân', email: 'letan01@hoangan.vn', password: 'letan123' },
  ];

  card = el('div', { class: 'login-page' },
    el('div', { class: 'login-card' },
      el('div', { class: 'login-header' },
        el('h1', {}, 'Hệ Thống Quản Trị Khách Sạn'),
        el('p', {}, 'Đăng nhập dành cho nhân viên quản lý')
      ),
      el('form', { class: 'login-form', onsubmit: async (e) => {
        e.preventDefault();
        const email = form.querySelector('[name=email]').value;
        const password = form.querySelector('[name=password]').value;
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true; btn.textContent = 'Đang đăng nhập...';
        try {
          await authService.login(email, password);
          toast('Đăng nhập thành công', 'success');
          location.hash = '#/dashboard';
        } catch (err) {
          toast(err.message || 'Đăng nhập thất bại', 'error');
        } finally {
          btn.disabled = false; btn.textContent = 'Đăng Nhập Hệ Thống';
        }
      }}, ...(() => {
        const groups = [];
        groups.push(el('div', { class: 'form-group' },
          el('label', { class: 'form-label' }, 'Email'),
          el('input', { class: 'form-input', type: 'email', name: 'email', placeholder: 'Nhập email', required: true })
        ));
        groups.push(el('div', { class: 'form-group' },
          el('label', { class: 'form-label' }, 'Mật khẩu'),
          el('input', { class: 'form-input', type: 'password', name: 'password', placeholder: '••••••••', required: true })
        ));
        groups.push(el('button', { class: 'btn btn-primary', type: 'submit', style: { width: '100%', justifyContent: 'center' } }, 'Đăng Nhập Hệ Thống'));
        return groups;
      })()),
      el('div', { class: 'login-demo-accounts' },
        el('p', { class: 'login-demo-title' }, 'Tài khoản nhân viên (demo):'),
        ...demoAccounts.map(acc => el('div', { class: 'login-demo-account' },
          el('span', { class: 'login-demo-role' }, acc.label),
          el('span', { class: 'login-demo-cred' }, `${acc.email} / ${acc.password}`),
          el('button', { class: 'btn btn-secondary btn-sm', type: 'button', onclick: () => {
            card.querySelector('[name=email]').value = acc.email;
            card.querySelector('[name=password]').value = acc.password;
          } }, 'Điền')
        ))
      ),
      el('div', { class: 'login-footer' },
        el('a', { href: '#/forgot-password', style: { fontSize: '13px', color: 'var(--color-primary)' } }, 'Quên mật khẩu?'),
        el('p', { style: { marginTop: '10px', fontSize: '13px' } },
          el('a', { href: '/' }, '← Về website khách hàng'))
      )
    )
  );
  const form = card.querySelector('form');
  container.appendChild(card);
}
