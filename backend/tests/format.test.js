import { formatVND, formatDate, formatDateTime, formatNumber } from '../utils/format.js';

describe('Format utilities', () => {
  test('formatVND should format positive number', () => {
    const result = formatVND(1000000);
    expect(result).toContain('1.000.000');
    expect(result).toContain('₫');
  });

  test('formatVND should handle zero', () => {
    const result = formatVND(0);
    expect(result).toContain('0');
  });

  test('formatVND should handle null/undefined', () => {
    expect(formatVND(null)).toContain('0');
    expect(formatVND(undefined)).toContain('0');
  });

  test('formatDate should format date correctly', () => {
    const result = formatDate('2026-09-15');
    expect(result).toBe('15/09/2026');
  });

  test('formatDate should handle null', () => {
    expect(formatDate(null)).toBe('');
  });

  test('formatDateTime should format datetime correctly', () => {
    const result = formatDateTime('2026-09-15T14:30:00');
    expect(result).toContain('15/09/2026');
    expect(result).toContain('14:30');
  });

  test('formatNumber should format number', () => {
    expect(formatNumber(1234567)).toContain('1.234.567');
  });
});
