import { createError } from '../utils/errors.js';

function sanitizeTextValue(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<script\b[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '');
}

function sanitizeObject(obj) {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => (typeof item === 'object' && item !== null ? sanitizeObject(item) : sanitizeTextValue(item)));
  }
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize mọi chuỗi đầu vào, không chỉ whitelist — chống XSS xuyên qua
    // các trường mới thêm về sau.
    if (typeof value === 'string') {
      result[key] = sanitizeTextValue(value);
    } else if (value !== null && typeof value === 'object') {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const result = schema.safeParse(data);
    if (!result.success) {
      const error = createError('VALIDATION_ERROR', {
        details: result.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return next(error);
    }
    req.validatedData = sanitizeObject(result.data);
    next();
  };
}
