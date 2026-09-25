import { signToken, verifyToken } from '../config/jwt.js';

describe('JWT utilities', () => {
  test('signToken should produce a valid JWT', () => {
    const token = signToken({ id: 1, role: 'Admin' }, 'staff');
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  test('verifyToken should decode a valid token', () => {
    const token = signToken({ id: 1, role: 'Admin' }, 'staff');
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(1);
    expect(decoded.role).toBe('Admin');
  });

  test('verifyToken should throw for invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });

  test('different payloads produce different tokens', () => {
    const t1 = signToken({ id: 1, role: 'Admin' }, 'staff');
    const t2 = signToken({ id: 2, role: 'LeTan' }, 'staff');
    expect(t1).not.toBe(t2);
  });
});
