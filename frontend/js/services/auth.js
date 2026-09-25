import { api, setToken, clearToken, getToken } from './api.js';

export const authService = {
  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    if (res.data?.token) {
      setToken(res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async customerLogin(email, password) {
    const res = await api.post('/customers/login', { email, password });
    if (res.data?.token) {
      setToken(res.data.token);
      localStorage.setItem('user', JSON.stringify({ ...res.data.customer, vai_tro: 'Customer' }));
    }
    return res.data;
  },

  async customerRegister(data) {
    const res = await api.post('/customers/register', data);
    if (res.data?.token) {
      setToken(res.data.token);
      localStorage.setItem('user', JSON.stringify({ ...res.data.customer, vai_tro: 'Customer' }));
    }
    return res.data;
  },

  async logout() {
    // Thu hồi token phía server (AUTH_REVOKED_TOKEN) trước khi xóa phiên client.
    try { await api.post('/auth/logout', {}); }
    catch { /* token đã hết hạn hoặc offline — vẫn xóa phiên cục bộ */ }
    clearToken();
    localStorage.removeItem('user');
  },

  async forgotPassword(email) {
    return api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token, newPassword) {
    return api.post('/auth/reset-password', { token, newPassword });
  },

  async changePassword(currentPassword, newPassword) {
    return api.post('/auth/change-password', { currentPassword, newPassword });
  },

  async me() {
    const res = await api.get('/auth/me');
    if (res.data) localStorage.setItem('user', JSON.stringify(res.data));
    return res.data;
  },

  getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn() { return !!getToken(); },

  getRole() { const u = this.getUser(); return u?.vai_tro || u?.role; },

  hasRole(...roles) { return roles.includes(this.getRole()); },
};
