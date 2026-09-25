import { createError, AppError, ERROR_CODES } from '../utils/errors.js';

describe('Error System', () => {
  test('createError should create AppError with correct code and status', () => {
    const err = createError('AUTH_INVALID_CREDENTIALS');
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Email hoặc mật khẩu không đúng');
  });

  test('createError should allow message override', () => {
    const err = createError('VALIDATION_ERROR', { message: 'Custom message' });
    expect(err.message).toBe('Custom message');
    expect(err.statusCode).toBe(400);
  });

  test('CHECKOUT_UNPAID should be 409', () => {
    const err = createError('CHECKOUT_UNPAID');
    expect(err.statusCode).toBe(409);
  });

  test('ROOM_NOT_AVAILABLE should be 409', () => {
    const err = createError('ROOM_NOT_AVAILABLE');
    expect(err.statusCode).toBe(409);
  });

  test('OVERPAYMENT should be 409', () => {
    const err = createError('OVERPAYMENT');
    expect(err.statusCode).toBe(409);
  });

  test('PERMISSION_DENIED should be 403', () => {
    const err = createError('PERMISSION_DENIED');
    expect(err.statusCode).toBe(403);
  });

  test('All required error codes exist', () => {
    const required = [
      'AUTH_INVALID_CREDENTIALS', 'AUTH_ACCOUNT_LOCKED', 'AUTH_UNAUTHORIZED',
      'PERMISSION_DENIED', 'VALIDATION_ERROR', 'NOT_FOUND',
      'ROOM_NOT_AVAILABLE', 'OVERPAYMENT', 'CHECKOUT_UNPAID',
      'INVALID_STATUS_TRANSITION', 'SERVICE_INACTIVE', 'NO_SHOW_TOO_EARLY',
      'DUPLICATE_EMAIL', 'DUPLICATE_ROOM_NUMBER', 'DUPLICATE_CUSTOMER_ID',
      'BOOKING_ALREADY_CHECKED_IN', 'BOOKING_NOT_CHECKED_IN',
      'INVOICE_ALREADY_EXISTS', 'PROMO_INVALID', 'REVIEW_NOT_ELIGIBLE',
    ];
    for (const code of required) {
      expect(ERROR_CODES[code]).toBeDefined();
    }
  });
});
