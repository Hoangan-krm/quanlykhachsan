import rateLimit from 'express-rate-limit';

const isTest = process.env.NODE_ENV === 'test';

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : 5,
  message: {
    success: false,
    data: null,
    message: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 1 phút.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 10000 : 300,
  message: {
    success: false,
    data: null,
    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter cho các action public nhạy cảm khác (validate mã KM, tra cứu guest…).
export const guestActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 1000 : 30,
  message: {
    success: false,
    data: null,
    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau một phút.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
