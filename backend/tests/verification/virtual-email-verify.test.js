import { jest } from '@jest/globals';
import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('Virtual Email Verification — TEST 1..TEST 10', () => {
  let notificationSpy;

  beforeAll(async () => {
    await bootEnvironment();
  }, 120000);

  afterAll(async () => {
    await db.closePool();
    await shutdownEnvironment();
  });

  describe('TEST 1-3: Registration with various email domains auto-verifies', () => {
    beforeAll(async () => {
      await resetDatabase();
      const { notificationService } = await import('../../services/notificationService.js');
      notificationSpy = jest.spyOn(notificationService, 'sendAccountVerification').mockResolvedValue({ delivered: false, mode: 'logged' });
    });

    afterAll(() => {
      notificationSpy?.mockRestore();
    });

    test('TEST 1: registration with Gmail email succeeds and auto-verifies', async () => {
      const r = await api.post('/api/customers/register', {
        ho_ten: 'Test Gmail User',
        email: 'test@gmail.com',
        sdt: '0901111111',
        cccd_passport: 'TESTGMAIL001',
        password: 'Test1234!',
      });
      expect(r.status).toBe(201);
      expect(r.body.data.email_verified).toBe(true);
      expect(r.body.data.verification_required).toBe(false);
      expect(r.body.data.verification_url_dev).toBeUndefined();
      const row = await db.findRow('KHACH_HANG', { email: 'test@gmail.com' });
      expect(row).not.toBeNull();
      expect(Number(row.email_verified)).toBe(1);
      expect(notificationSpy).not.toHaveBeenCalled();
    });

    test('TEST 2: registration with Yahoo email succeeds and auto-verifies', async () => {
      const r = await api.post('/api/customers/register', {
        ho_ten: 'Test Yahoo User',
        email: 'abc123@yahoo.com',
        sdt: '0902222222',
        cccd_passport: 'TESTYAHOO001',
        password: 'Test1234!',
      });
      expect(r.status).toBe(201);
      expect(r.body.data.email_verified).toBe(true);
      const row = await db.findRow('KHACH_HANG', { email: 'abc123@yahoo.com' });
      expect(Number(row.email_verified)).toBe(1);
      expect(notificationSpy).not.toHaveBeenCalled();
    });

    test('TEST 3: registration with local-domain email succeeds and auto-verifies', async () => {
      const r = await api.post('/api/customers/register', {
        ho_ten: 'Test Local Domain',
        email: 'demo@hotel.local',
        sdt: '0903333333',
        cccd_passport: 'TESTLOCAL001',
        password: 'Test1234!',
      });
      expect(r.status).toBe(201);
      expect(r.body.data.email_verified).toBe(true);
      const row = await db.findRow('KHACH_HANG', { email: 'demo@hotel.local' });
      expect(Number(row.email_verified)).toBe(1);
      expect(notificationSpy).not.toHaveBeenCalled();
    });
  });

  describe('TEST 4: Immediate login after registration succeeds', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('TEST 4: register then login immediately — no ACCOUNT_NOT_VERIFIED', async () => {
      const reg = await api.post('/api/customers/register', {
        ho_ten: 'Immediate Login User',
        email: 'immediate@test.com',
        sdt: '0904444444',
        cccd_passport: 'IMMEDIATE001',
        password: 'Test1234!',
      });
      expect(reg.status).toBe(201);

      const login = await api.post('/api/customers/login', {
        email: 'immediate@test.com',
        password: 'Test1234!',
      });
      expect(login.status).toBe(200);
      expect(login.body.data.token).toBeDefined();
      expect(login.body.code).not.toBe('ACCOUNT_NOT_VERIFIED');
      expect(login.body.data?.code).not.toBe('ACCOUNT_NOT_VERIFIED');
    });
  });

  describe('TEST 5: Session persistence after page refresh', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('TEST 5: token remains valid for authenticated request after "refresh"', async () => {
      const reg = await api.post('/api/customers/register', {
        ho_ten: 'Session Persist User',
        email: 'session@test.com',
        sdt: '0905555555',
        cccd_passport: 'SESSION001',
        password: 'Test1234!',
      });
      expect(reg.status).toBe(201);
      const login = await api.post('/api/customers/login', {
        email: 'session@test.com',
        password: 'Test1234!',
      });
      expect(login.status).toBe(200);
      const token = login.body.data.token;
      const me = await api.get('/api/customers/me', token);
      expect(me.status).toBe(200);
      expect(me.body.data.email).toBe('session@test.com');
    });
  });

  describe('TEST 6: Logout and re-login succeeds', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('TEST 6: login → logout → re-login works', async () => {
      const reg = await api.post('/api/customers/register', {
        ho_ten: 'Relogin User',
        email: 'relogin@test.com',
        sdt: '0906666666',
        cccd_passport: 'RELOGIN001',
        password: 'Test1234!',
      });
      expect(reg.status).toBe(201);
      const login1 = await api.post('/api/customers/login', {
        email: 'relogin@test.com',
        password: 'Test1234!',
      });
      expect(login1.status).toBe(200);
      const token1 = login1.body.data.token;
      const logout = await api.post('/api/auth/logout', {}, token1);
      expect([200, 204]).toContain(logout.status);
      const login2 = await api.post('/api/customers/login', {
        email: 'relogin@test.com',
        password: 'Test1234!',
      });
      expect(login2.status).toBe(200);
      expect(login2.body.data.token).toBeDefined();
    });
  });

  describe('TEST 7: Login with phone number succeeds', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('TEST 7: register with phone then login with phone', async () => {
      const reg = await api.post('/api/customers/register', {
        ho_ten: 'Phone Login User',
        email: 'phone@test.com',
        sdt: '0907777777',
        cccd_passport: 'PHONELOGIN001',
        password: 'Test1234!',
      });
      expect(reg.status).toBe(201);
      const login = await api.post('/api/customers/login', {
        login: '0907777777',
        password: 'Test1234!',
      });
      expect(login.status).toBe(200);
      expect(login.body.data.token).toBeDefined();
    });
  });

  describe('TEST 8: Staff/admin login not affected', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('TEST 8: admin login works and admin endpoint accessible', async () => {
      const admin = await auth.loginAsAdmin();
      expect(admin.status).toBe(200);
      expect(admin.token).toBeDefined();
      const decoded = JSON.parse(Buffer.from(admin.token.split('.')[1], 'base64').toString());
      expect(decoded.role).toBe('Admin');
      const customers = await api.get('/api/customers', admin.token);
      expect(customers.status).toBe(200);
    });
  });

  describe('TEST 9: No real email request during auth flows', () => {
    let spy;

    beforeAll(async () => {
      await resetDatabase();
      const { notificationService } = await import('../../services/notificationService.js');
      spy = jest.spyOn(notificationService, 'sendAccountVerification').mockResolvedValue({ delivered: false, mode: 'logged' });
    });

    afterAll(() => { spy?.mockRestore(); });

    test('TEST 9: register + login + resend do not call sendAccountVerification', async () => {
      const reg = await api.post('/api/customers/register', {
        ho_ten: 'No Email User',
        email: 'noemail@test.com',
        sdt: '0908888888',
        cccd_passport: 'NOEMAIL001',
        password: 'Test1234!',
      });
      expect(reg.status).toBe(201);
      const login = await api.post('/api/customers/login', {
        email: 'noemail@test.com',
        password: 'Test1234!',
      });
      expect(login.status).toBe(200);
      const resend = await api.post('/api/customers/resend-verification', {
        email: 'noemail@test.com',
      });
      expect(resend.status).toBe(200);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('TEST 10: No SMTP/API key required', () => {
    let savedEnv;

    beforeAll(async () => {
      await resetDatabase();
      savedEnv = {};
      for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'SMTP_SECURE']) {
        savedEnv[key] = process.env[key];
        delete process.env[key];
      }
    });

    afterAll(() => {
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value !== undefined) process.env[key] = value;
      }
    });

    test('TEST 10: register and login succeed without any SMTP env vars', async () => {
      const reg = await api.post('/api/customers/register', {
        ho_ten: 'No SMTP User',
        email: 'nosmtp@test.com',
        sdt: '0909999999',
        cccd_passport: 'NOSMTP001',
        password: 'Test1234!',
      });
      expect(reg.status).toBe(201);
      expect(reg.body.data.email_verified).toBe(true);
      const login = await api.post('/api/customers/login', {
        email: 'nosmtp@test.com',
        password: 'Test1234!',
      });
      expect(login.status).toBe(200);
      expect(login.body.data.token).toBeDefined();
    });
  });
});
