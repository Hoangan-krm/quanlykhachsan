export function notFound(req, res) {
  res.status(404).json({
    success: false,
    data: null,
    message: `Không tìm thấy đường dẫn: ${req.method} ${req.originalUrl}`,
    error: 'NOT_FOUND',
  });
}
