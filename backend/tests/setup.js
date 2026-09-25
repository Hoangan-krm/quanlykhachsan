import { signToken } from '../config/jwt.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jest-32chars!!';
process.env.NODE_ENV = 'test';

export function getAuthToken(role = 'Admin', id = 1) {
  return signToken({ id, role }, 'staff');
}

export function authHeader(role = 'Admin', id = 1) {
  return { Authorization: `Bearer ${getAuthToken(role, id)}` };
}
