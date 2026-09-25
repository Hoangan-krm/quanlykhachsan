import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';
import { readFileSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const FRONTEND = join(ROOT, 'frontend');

function read(p) { return readFileSync(p, 'utf8'); }

describe('SEC-12 — XSS Sanitization', () => {
  // sanitize.js dead-file đã bị loại bỏ trong đại tu: XSS được chặn tập trung ở
  // backend middleware/validate.js (sanitize mọi chuỗi) + frontend dùng
  // createTextNode (dom.js) nên không có vector innerHTML.
  describe('SEC-12.1: Backend sanitizer covers every string field (no whitelist gap)', () => {
    let content;

    beforeAll(() => {
      content = read(join(ROOT, 'backend', 'middleware', 'validate.js'));
    });

    test('sanitizeObject applies sanitizeTextValue to all string values, not a whitelist', () => {
      expect(content).toMatch(/if\s*\(\s*typeof\s+value\s*===\s*'string'\s*\)\s*\{\s*\n?\s*result\[key\]\s*=\s*sanitizeTextValue\(value\);/);
      expect(content).not.toMatch(/TEXT_FIELD_CANDIDATES/);
    });

    test('strips script tags, inline event handlers and javascript: URIs', () => {
      expect(content).toContain('<script');
      expect(content).toContain('on\\w+');
      expect(content).toContain('javascript');
    });

    test('frontend renders text via createTextNode (no innerHTML vector in dom.js)', () => {
      const dom = read(join(FRONTEND, 'js', 'utils', 'dom.js'));
      expect(dom).toMatch(/createTextNode/);
      expect(dom).not.toMatch(/innerHTML\s*=/);
    });
  });

  describe('SEC-12.2: Backend sanitizes XSS payload on customer creation', () => {
    beforeAll(async () => { await bootEnvironment(); await resetDatabase(); }, 120000);
    afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

    test('POST /api/customers with <script> in ho_ten → script stripped', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.post('/api/customers', {
        ho_ten: '<script>alert("xss")</script>Test Customer',
        sdt: '0988123456',
        cccd_passport: 'XSS-TEST-001',
      }, token);
      expect(r.status).toBe(201);
      expect(r.body.data.ho_ten).not.toMatch(/<script>/i);
      expect(r.body.data.ho_ten).not.toMatch(/alert\(/);
    });

    test('POST /api/customers with event handler in ho_ten → handler stripped', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.post('/api/customers', {
        ho_ten: '<img src=x onerror=alert(1)>Test',
        sdt: '0988123457',
        cccd_passport: 'XSS-TEST-002',
      }, token);
      expect(r.status).toBe(201);
      expect(r.body.data.ho_ten).not.toMatch(/onerror/i);
    });

    test('POST /api/customers with javascript: URI → stripped', async () => {
      const { token } = await auth.loginAsLeTan();
      const r = await api.post('/api/customers', {
        ho_ten: 'javascript:alert(1) Test',
        sdt: '0988123458',
        cccd_passport: 'XSS-TEST-003',
      }, token);
      expect(r.status).toBe(201);
      expect(r.body.data.ho_ten).not.toMatch(/javascript:/i);
    });
  });
});
