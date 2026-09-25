export function parsePagination(query = {}) {
  let page = parseInt(query.page || '1', 10);
  let limit = parseInt(query.limit || '20', 10);
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function buildPaginationResponse(data, total, page, limit) {
  return {
    success: true,
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    message: 'OK',
  };
}
