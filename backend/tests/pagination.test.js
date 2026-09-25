import { parsePagination, buildPaginationResponse } from '../utils/pagination.js';

describe('Pagination utilities', () => {
  test('parsePagination should use defaults', () => {
    const p = parsePagination({});
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
    expect(p.offset).toBe(0);
  });

  test('parsePagination should parse valid values', () => {
    const p = parsePagination({ page: '3', limit: '10' });
    expect(p.page).toBe(3);
    expect(p.limit).toBe(10);
    expect(p.offset).toBe(20);
  });

  test('parsePagination should clamp invalid values', () => {
    const p = parsePagination({ page: '-1', limit: '999' });
    expect(p.page).toBe(1);
    expect(p.limit).toBe(100);
  });

  test('buildPaginationResponse should return correct shape', () => {
    const res = buildPaginationResponse([1, 2, 3], 30, 2, 10);
    expect(res.success).toBe(true);
    expect(res.data).toEqual([1, 2, 3]);
    expect(res.total).toBe(30);
    expect(res.page).toBe(2);
    expect(res.limit).toBe(10);
    expect(res.totalPages).toBe(3);
  });
});
