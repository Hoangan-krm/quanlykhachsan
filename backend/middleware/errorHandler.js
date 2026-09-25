import { AppError, ERROR_CODES } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      data: null,
      message: err.message,
      error: err.code,
      details: err.details || undefined,
    });
  }

  if (err.code === 'AUTH_TOKEN_EXPIRED' || err.code === 'AUTH_TOKEN_INVALID') {
    const config = ERROR_CODES[err.code];
    return res.status(config.statusCode).json({
      success: false,
      data: null,
      message: config.message,
      error: err.code,
    });
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Dữ liệu không hợp lệ',
      error: 'VALIDATION_ERROR',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  logger.error('Unhandled error:', err.message, { stack: err.stack, path: req.path, method: req.method });

  const isDev = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    success: false,
    data: null,
    message: 'Lỗi hệ thống, vui lòng thử lại sau',
    error: 'INTERNAL_ERROR',
    details: isDev ? { message: err.message, stack: err.stack } : undefined,
  });
}
