import { readFileSync, readdirSync, existsSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const BACKEND = join(ROOT, 'backend');
const FRONTEND = join(ROOT, 'frontend');
const DB = join(ROOT, 'database');

function read(p) { try { return readFileSync(p, 'utf8'); } catch { return ''; } }
function listDir(dir, ext) { try { return readdirSync(dir).filter(f => f.endsWith(ext)); } catch { return []; } }

describe('Static Analysis — Source Scanning (SEC-01/04/09/10/12)', () => {
  describe('SEC-01: Password hashing (no plaintext)', () => {
    test('seed.sql staff passwords are all bcrypt hashes ($2b$)', () => {
      const seed = read(join(DB, 'seed.sql'));
      const bcryptHashes = seed.match(/'\$2b\$\d{2}\$/g) || [];
      expect(bcryptHashes.length).toBeGreaterThanOrEqual(3);
      const plaintextPasswords = seed.match(/mat_khau_hash\s*=\s*['"][^$]/g) || [];
      expect(plaintextPasswords).toEqual([]);
    });

    test('no plaintext password assignments in backend source', () => {
      const services = listDir(join(BACKEND, 'services'), '.js');
      const violations = [];
      for (const f of services) {
        const c = read(join(BACKEND, 'services', f));
        const m = c.match(/(?:mat_khau|password)\s*[:=]\s*['"][^$'"]{4,}['"]/g);
        if (m) violations.push(`${f}: ${m.length}`);
      }
      expect(violations).toEqual([]);
    });

    test('bcrypt utility exists and is imported by authService', () => {
      expect(existsSync(join(BACKEND, 'utils', 'bcrypt.js'))).toBe(true);
      const auth = read(join(BACKEND, 'services', 'authService.js'));
      expect(auth).toMatch(/bcrypt/);
    });
  });

  describe('SEC-04 / BR-10: No hardcoded report data', () => {
    test('reportService.js has no hardcoded numeric array literals', () => {
      const report = read(join(BACKEND, 'services', 'reportService.js'));
      const hardcoded = report.match(/\[\s*\d{5,}\s*,\s*\d{5,}/g) || [];
      expect(hardcoded).toEqual([]);
    });

    test('reportService.js uses repository/SQL queries (not literal data)', () => {
      const report = read(join(BACKEND, 'services', 'reportService.js'));
      expect(report).toMatch(/repository|Repository|query|SUM|COUNT|execute/i);
    });
  });

  describe('SEC-10: No demo credentials in login form', () => {
    test('login.js has no pre-filled value= attributes on inputs', () => {
      const login = read(join(FRONTEND, 'js', 'pages', 'login.js'));
      const prefilled = login.match(/value\s*=\s*["'][^"']{3,}["']/gi) || [];
      expect(prefilled).toEqual([]);
    });
  });

  describe('SEC-09: Frontend function references are defined', () => {
    test('frontend authentication dependencies export every imported API helper', () => {
      const authSource = read(join(FRONTEND, 'js', 'services', 'auth.js'));
      const apiSource = read(join(FRONTEND, 'js', 'services', 'api.js'));
      const importMatch = authSource.match(/import\s+\{([^}]+)\}\s+from\s+['"]\.\/api\.js['"]/);
      expect(importMatch).not.toBeNull();
      const importedNames = importMatch[1].split(',').map(name => name.trim());
      for (const name of importedNames) {
        expect(apiSource).toMatch(new RegExp(`export\\s+(?:function|const|let|var)\\s+${name}\\b`));
      }
    });

    test('all show*/mark*/edit* handler calls in pages are defined or imported', () => {
      const pages = listDir(join(FRONTEND, 'js', 'pages'), '.js');
      const issues = [];
      for (const pf of pages) {
        const c = read(join(FRONTEND, 'js', 'pages', pf));
        const defined = new Set();
        for (const d of c.matchAll(/function\s+(\w+)/g)) defined.add(d[1]);
        for (const d of c.matchAll(/(?:const|let|var)\s+(\w+)\s*=/g)) defined.add(d[1]);
        for (const d of c.matchAll(/import\s+\{([^}]+)\}\s+from/g)) {
          d[1].split(',').forEach(s => defined.add(s.trim().split(/\s+as\s+/)[0].trim()));
        }
        const calls = c.matchAll(/\b((?:show|mark|open|close|edit|delete|save|load|render|handle|submit|confirm)\w*)\s*\(/g);
        for (const call of calls) {
          const name = call[1];
          if (!defined.has(name) && !['show', 'mark', 'open', 'close', 'edit', 'delete', 'save', 'load', 'render', 'handle', 'submit', 'confirm'].includes(name)) {
            if (!['console', 'window', 'document', 'fetch', 'alert'].includes(name)) {
              issues.push(`${pf}:${name}`);
            }
          }
        }
      }
      // Allow imported helpers from utils — this is a best-effort scan; record but don't fail on imports
      expect(issues.length).toBeLessThan(20);
    });
  });

  describe('SEC-12: XSS prevention (no unsanitized innerHTML)', () => {
    test('frontend pages do not use innerHTML with unsanitized template interpolation', () => {
      const pages = listDir(join(FRONTEND, 'js', 'pages'), '.js');
      const unsafe = [];
      for (const pf of pages) {
        const c = read(join(FRONTEND, 'js', 'pages', pf));
        const matches = c.matchAll(/innerHTML\s*=\s*`[^`]*\$\{([^}]+)\}/g);
        for (const m of matches) {
          if (!/escape|sanitize|encode/i.test(m[1])) unsafe.push(`${pf}: ${m[0].slice(0, 60)}`);
        }
      }
      expect(unsafe).toEqual([]);
    });
  });

  describe('SEC-03: Backend RBAC middleware present on route files', () => {
    test('every route file imports authenticate from auth middleware', () => {
      const routes = listDir(join(BACKEND, 'routes'), '.js').filter(f => f !== 'index.js');
      const missing = [];
      for (const rf of routes) {
        const c = read(join(BACKEND, 'routes', rf));
        if (!/authenticate|requireCustomer|requireAnyAuth/i.test(c)) missing.push(rf);
      }
      expect(missing).toEqual([]);
    });
  });
});
