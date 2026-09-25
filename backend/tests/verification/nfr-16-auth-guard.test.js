import { readFileSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const FRONTEND = join(ROOT, 'frontend');

function read(p) { return readFileSync(p, 'utf8'); }

// Đại tu: authGuard.js (dead file, 2 hệ thống guard song song) đã bị xóa.
// Phân quyền route giờ thống nhất một chỗ: STAFF_ROUTE_ROLES trong router.js,
// khách hàng bị khóa vào CUSTOMER_PATHS, chặn trước khi render trang.
describe('NFR-16 — Auth Guard & 401 Interceptor', () => {
  describe('NFR-16.1: router.js enforces per-route role guards', () => {
    let content;

    beforeAll(() => {
      content = read(join(FRONTEND, 'js', 'router.js'));
    });

    test('staff routes declare required roles explicitly', () => {
      expect(content).toContain('STAFF_ROUTE_ROLES');
      expect(content).toMatch(/'\/staff'\s*:\s*\['Admin'\]/);
      expect(content).toMatch(/'\/bookings'\s*:\s*\['Admin',\s*'QuanLy',\s*'LeTan'\]/);
    });

    test('redirects staff without the required role and keeps customers in the portal', () => {
      expect(content).toMatch(/STAFF_ROUTE_ROLES\[path\]/);
      expect(content).toMatch(/CUSTOMER_PATHS/);
    });

    test('unauthenticated users are redirected to login', () => {
      expect(content).toMatch(/#\/login/);
    });
  });

  describe('NFR-16.2: api.js has 401 interceptor', () => {
    let content;

    beforeAll(() => {
      content = read(join(FRONTEND, 'js', 'services', 'api.js'));
    });

    test('handles 401 status', () => {
      expect(content).toMatch(/401/);
    });

    test('clears token on 401', () => {
      expect(content).toMatch(/clearToken/);
    });

    test('redirects to login on 401', () => {
      expect(content).toMatch(/login/i);
    });
  });

  describe('NFR-16.3: logout revokes the server-side token', () => {
    test('auth service calls POST /auth/logout before clearing the local session', () => {
      const content = read(join(FRONTEND, 'js', 'services', 'auth.js'));
      expect(content).toMatch(/auth\/logout/);
      expect(content).toMatch(/clearToken\(\)/);
    });
  });
});
