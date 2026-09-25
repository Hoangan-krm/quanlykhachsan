import { readFileSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..', '..');
const FRONTEND = join(ROOT, 'frontend');

function read(p) { return readFileSync(p, 'utf8'); }

describe('NFR-14 — UI State Helper & API Timeout', () => {
  describe('NFR-14.1: uiState.js exports required functions', () => {
    let content;

    beforeAll(() => {
      content = read(join(FRONTEND, 'js', 'utils', 'uiState.js'));
    });

    test('showLoading is exported', () => {
      expect(content).toMatch(/export\s+function\s+showLoading\b|export\s+const\s+showLoading\b/);
    });

    test('showError is exported', () => {
      expect(content).toMatch(/export\s+function\s+showError\b|export\s+const\s+showError\b/);
    });

    test('showEmpty is exported', () => {
      expect(content).toMatch(/export\s+function\s+showEmpty\b|export\s+const\s+showEmpty\b/);
    });

    test('clearState is exported', () => {
      expect(content).toMatch(/export\s+function\s+clearState\b|export\s+const\s+clearState\b/);
    });

    test('render is exported', () => {
      expect(content).toMatch(/export\s+(async\s+)?function\s+render\b|export\s+const\s+render\b/);
    });
  });

  describe('NFR-14.2: api.js has timeout mechanism', () => {
    let content;

    beforeAll(() => {
      content = read(join(FRONTEND, 'js', 'services', 'api.js'));
    });

    test('defines a timeout constant', () => {
      expect(content).toMatch(/TIMEOUT|timeout/i);
    });

    test('uses AbortController for timeout', () => {
      expect(content).toMatch(/AbortController/);
    });

    test('timeout value is configured (e.g. 15000ms)', () => {
      expect(content).toMatch(/\d{4,5}/);
    });
  });
});
