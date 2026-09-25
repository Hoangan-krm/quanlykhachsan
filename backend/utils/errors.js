export class AppError extends Error {
  constructor(code, message, statusCode, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS:    { statusCode: 401, message: 'Email hoặc mật khẩu không đúng' },
  AUTH_ACCOUNT_LOCKED:         { statusCode: 401, message: 'Tài khoản đã bị khóa do nhập sai mật khẩu nhiều lần' },
  ACCOUNT_NOT_VERIFIED:        { statusCode: 403, message: 'Tài khoản chưa được xác thực email' },
  AUTH_TOKEN_EXPIRED:          { statusCode: 401, message: 'Phiên đăng nhập đã hết hạn' },
  AUTH_TOKEN_INVALID:          { statusCode: 401, message: 'Token không hợp lệ' },
  AUTH_UNAUTHORIZED:           { statusCode: 401, message: 'Vui lòng đăng nhập' },
  PERMISSION_DENIED:           { statusCode: 403, message: 'Bạn không có quyền thực hiện hành động này' },
  VALIDATION_ERROR:            { statusCode: 400, message: 'Dữ liệu không hợp lệ' },
  NOT_FOUND:                   { statusCode: 404, message: 'Không tìm thấy dữ liệu' },
  ROOM_NOT_AVAILABLE:          { statusCode: 409, message: 'Phòng không trống trong khoảng ngày đã chọn' },
  OVERPAYMENT:                 { statusCode: 409, message: 'Số tiền vượt quá số tiền còn lại' },
  CHECKOUT_UNPAID:             { statusCode: 409, message: 'Hóa đơn chưa thanh toán đủ. Không thể trả phòng.' },
  INVALID_STATUS_TRANSITION:   { statusCode: 409, message: 'Không thể chuyển trạng thái này' },
  SERVICE_INACTIVE:            { statusCode: 409, message: 'Dịch vụ hiện không khả dụng' },
  NO_SHOW_TOO_EARLY:           { statusCode: 409, message: 'Chưa đến giờ check-in, không thể đánh dấu vắng mặt' },
  DUPLICATE_EMAIL:             { statusCode: 409, message: 'Email đã tồn tại' },
  DUPLICATE_ROOM_NUMBER:       { statusCode: 409, message: 'Số phòng đã tồn tại' },
  DUPLICATE_CUSTOMER_ID:       { statusCode: 409, message: 'Số CCCD/Passport đã tồn tại' },
  BOOKING_ALREADY_CHECKED_IN:  { statusCode: 409, message: 'Đặt phòng đã được nhận, không thể chỉnh sửa' },
  BOOKING_NOT_CHECKED_IN:      { statusCode: 409, message: 'Đặt phòng chưa được nhận phòng' },
  INVOICE_ALREADY_EXISTS:      { statusCode: 409, message: 'Hóa đơn đã tồn tại cho đặt phòng này' },
  REFUND_EXCEEDS_COLLECTED:    { statusCode: 409, message: 'Số tiền hoàn lại vượt quá số đã thu' },
  HAS_ACTIVE_BOOKING:          { statusCode: 409, message: 'Không thể xóa: đang có đặt phòng hoạt động' },
  HAS_ROOMS:                   { statusCode: 409, message: 'Không thể xóa: đang có phòng thuộc loại này' },
  ROOM_HAS_ACTIVE_BOOKINGS:    { statusCode: 409, message: 'Không thể xóa phòng: đang có đặt phòng hoạt động' },
  ROOM_TYPE_HAS_ROOMS:         { statusCode: 409, message: 'Không thể xóa loại phòng: đang có phòng thuộc loại này' },
  EXTEND_CONFLICT:             { statusCode: 409, message: 'Không thể gia hạn: xung đột với đặt phòng khác' },
  BOOKING_CONFLICT:            { statusCode: 409, message: 'Xung đột thời gian đặt phòng' },
  USED_IN_BOOKINGS:            { statusCode: 409, message: 'Không thể xóa: dịch vụ đã được sử dụng trong đặt phòng' },
  PROMO_INVALID:               { statusCode: 409, message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn' },
  SHIFT_ALREADY_OPEN:          { statusCode: 409, message: 'Đang có ca làm việc mở' },
  SHIFT_ALREADY_CLOSED:        { statusCode: 409, message: 'Ca làm việc đã đóng' },
  REVIEW_NOT_ELIGIBLE:         { statusCode: 409, message: 'Chỉ có thể đánh giá sau khi trả phòng' },
  PAYMENT_GATEWAY_UNAVAILABLE: { statusCode: 503, message: 'Cổng thanh toán online chưa được cấu hình' },
  PAYMENT_GATEWAY_ERROR:       { statusCode: 502, message: 'Cổng thanh toán online không khả dụng' },
  INTERNAL_ERROR:              { statusCode: 500, message: 'Lỗi hệ thống, vui lòng thử lại sau' },
};

export function createError(code, overrides = {}) {
  const config = ERROR_CODES[code] || ERROR_CODES.INTERNAL_ERROR;
  return new AppError(
    code,
    overrides.message || config.message,
    overrides.statusCode || config.statusCode,
    overrides.details || null
  );
}
