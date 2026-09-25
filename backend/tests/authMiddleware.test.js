import { jest } from '@jest/globals';
import { signToken } from '../config/jwt.js';
import { bootEnvironment, shutdownEnvironment } from './helpers/env.js';

let authenticate;
let requireRole;
let requireStaff;

beforeAll(async () => {
  await bootEnvironment();
  ({ authenticate, requireRole, requireStaff } = await import('../middleware/auth.js'));
}, 120000);
afterAll(async () => { await shutdownEnvironment(); });

function mockReqRes(authHeader = null) {
  const req = { headers: {} };
  if (authHeader) req.headers.authorization = authHeader;
  const res = {};
  const next = jest.fn();
  return { req, res, next };
}

describe('Auth Middleware', () => {
  test('authenticate should reject missing token', () => {
    const { req, res, next } = mockReqRes();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0]).toBeDefined();
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  test('authenticate should accept valid token', async () => {
    const token = signToken({ id: 1, role: 'Admin' }, 'staff');
    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(1);
    expect(req.user.role).toBe('Admin');
  });

  test('authenticate should reject invalid token', () => {
    const { req, res, next } = mockReqRes('Bearer invalidtoken');
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0]).toBeDefined();
  });

  test('requireRole should allow correct role', () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: 1, role: 'Admin', vai_tro: 'Admin' };
    requireRole('Admin')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('requireRole should reject wrong role', () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: 2, role: 'LeTan', vai_tro: 'LeTan' };
    requireRole('Admin')(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  test('requireRole should allow multiple roles', () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: 2, role: 'QuanLy', vai_tro: 'QuanLy' };
    requireRole('Admin', 'QuanLy')(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('requireStaff should allow all staff roles', () => {
    for (const role of ['Admin', 'QuanLy', 'LeTan']) {
      const { req, res, next } = mockReqRes();
      req.user = { id: 1, role, vai_tro: role };
      requireStaff(req, res, next);
      expect(next).toHaveBeenCalledWith();
    }
  });

  test('requireStaff should reject customer', () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: 1, role: 'Customer', vai_tro: 'Customer' };
    requireStaff(req, res, next);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});
