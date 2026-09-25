import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { randomUUID, randomBytes } from 'node:crypto';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
// Không chạy với secret mặc định biết trước: production fail-fast,
// dev dùng secret ngẫu nhiên phiên (token hết hiệu lực khi restart).
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  if (isProduction) {
    throw new Error('JWT_SECRET is required in production. Set it in the environment.');
  }
  console.warn('[SECURITY] JWT_SECRET not set — using an ephemeral dev secret. Tokens are invalidated on restart.');
  return randomBytes(48).toString('hex');
})();
const JWT_EXPIRES_IN_STAFF = process.env.JWT_EXPIRES_IN_STAFF || '8h';
const JWT_EXPIRES_IN_CUSTOMER = process.env.JWT_EXPIRES_IN_CUSTOMER || '2h';

export function signToken(payload, type = 'staff') {
  const expiresIn = type === 'customer' ? JWT_EXPIRES_IN_CUSTOMER : JWT_EXPIRES_IN_STAFF;
  return jwt.sign(payload, JWT_SECRET, { expiresIn, jwtid: randomUUID() });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const err = new Error('Token expired');
      err.code = 'AUTH_TOKEN_EXPIRED';
      throw err;
    }
    const err = new Error('Invalid token');
    err.code = 'AUTH_TOKEN_INVALID';
    throw err;
  }
}

export { JWT_SECRET, JWT_EXPIRES_IN_STAFF, JWT_EXPIRES_IN_CUSTOMER };
