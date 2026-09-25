import { verifyToken } from '../config/jwt.js';
import { createError } from '../utils/errors.js';
import { pool } from '../config/db.js';
import { authStateRepository, credentialVersion } from '../repositories/authState.repository.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('AUTH_UNAUTHORIZED'));
  }
  const token = authHeader.substring(7);
  try {
    const decoded = verifyToken(token);
    if (!['Admin', 'QuanLy', 'LeTan', 'Customer'].includes(decoded.role) || !Number.isInteger(decoded.id)) {
      return next(createError('AUTH_TOKEN_INVALID'));
    }
    if (await authStateRepository.isRevoked(token)) return next(createError('AUTH_TOKEN_INVALID'));
    const isCustomer = decoded.role === 'Customer';
    const [users] = await pool.execute(isCustomer ? 'SELECT * FROM KHACH_HANG WHERE id = ?' : 'SELECT * FROM NGUOI_DUNG WHERE id = ?', [decoded.id]);
    const user = users[0];
    if (!user) return next(createError('AUTH_TOKEN_INVALID'));
    if (!isCustomer && user.trang_thai !== 'Active') return next(createError('AUTH_ACCOUNT_LOCKED'));
    if (!isCustomer && user.vai_tro !== decoded.role) return next(createError('AUTH_TOKEN_INVALID'));
    if (decoded.credentialVersion && decoded.credentialVersion !== credentialVersion(user.mat_khau_hash)) return next(createError('AUTH_TOKEN_INVALID'));
    req.user = { id: user.id, role: decoded.role, vai_tro: decoded.role, ho_ten: user.ho_ten, email: user.email };
    req.auth = { token, expiresAt: decoded.exp };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.code === 'AUTH_TOKEN_EXPIRED') {
      return next(createError('AUTH_TOKEN_EXPIRED'));
    }
    if (error.name === 'JsonWebTokenError' || error.code === 'AUTH_TOKEN_INVALID') {
      return next(createError('AUTH_TOKEN_INVALID'));
    }
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('AUTH_UNAUTHORIZED'));
    }
    const userRole = req.user.vai_tro || req.user.role;
    if (!roles.includes(userRole)) {
      return next(createError('PERMISSION_DENIED'));
    }
    next();
  };
}

export function requireAnyAuth(req, res, next) {
  if (!req.user) {
    return next(createError('AUTH_UNAUTHORIZED'));
  }
  next();
}

export function requireCustomer(req, res, next) {
  if (!req.user) {
    return next(createError('AUTH_UNAUTHORIZED'));
  }
  const role = req.user.vai_tro || req.user.role;
  if (role !== 'Customer') {
    return next(createError('PERMISSION_DENIED'));
  }
  next();
}

export const requireAdmin = requireRole('Admin');
export const requireQuanLy = requireRole('QuanLy');
export const requireLeTan = requireRole('LeTan');
export const requireAdminOrQuanLy = requireRole('Admin', 'QuanLy');
export const requireAdminOrLeTan = requireRole('Admin', 'LeTan');
export const requireLeTanOrQuanLy = requireRole('LeTan', 'QuanLy');
export const requireStaff = requireRole('Admin', 'QuanLy', 'LeTan');
