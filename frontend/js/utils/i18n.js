// Lightweight i18n for the customer-facing website (NFR: VI/EN).
// Staff portal stays Vietnamese by design.

const DICTS = {
  vi: null, // keys are the Vietnamese source text
  en: {
    // nav & shell
    'Phòng': 'Rooms', 'Đặt phòng': 'Book now', 'Tra cứu': 'My booking', 'Tài khoản': 'Account', 'Đăng nhập': 'Sign in',
    'Đăng xuất': 'Sign out', 'Tiếng Việt': 'Tiếng Việt', 'English': 'English',
    // home
    'TRẢI NGHIỆM NGHỈ DƯỠNG': 'A PLACE TO UNWIND',
    'Một kỳ nghỉ nhẹ nhàng bắt đầu từ đây': 'A relaxing stay begins here',
    'Khám phá loại phòng, kiểm tra phòng trống và đặt phòng trong vài phút.': 'Discover room types, check availability and book in minutes.',
    'Kiểm tra phòng trống': 'Check availability',
    'Loại phòng': 'Room types', 'Đặt ngay': 'Book now', 'khách': 'guests', ' / đêm': ' / night',
    // auth
    'Đăng nhập khách hàng': 'Customer sign in', 'Email': 'Email', 'Mật khẩu': 'Password',
    'Quên mật khẩu?': 'Forgot password?',
    'Chưa có tài khoản? ': 'No account yet? ', 'Đăng ký': 'Sign up',
    'Tạo tài khoản': 'Create account', 'Họ và tên': 'Full name', 'Số điện thoại': 'Phone number',
    'CCCD / Passport': 'ID / Passport', 'Mật khẩu (ít nhất 8 ký tự, có chữ hoa và số)': 'Password (min 8 chars, one uppercase and one digit)',
    // booking
    'Đặt phòng trực tuyến': 'Book online', 'Nhận phòng': 'Check-in', 'Trả phòng': 'Check-out',
    'Tìm phòng': 'Search rooms', 'Ngày trả phòng phải sau ngày nhận phòng.': 'Check-out must be after check-in.',
    'Thông tin người đặt': 'Guest details', 'Email (không bắt buộc)': 'Email (optional)',
    'Mã khuyến mãi (nếu có)': 'Promo code (optional)', 'Số lượng khách': 'Guests',
    'Xác nhận đặt phòng': 'Confirm booking', 'Đặt phòng thành công': 'Booking confirmed',
    'Mã đặt phòng': 'Booking code', 'Tra cứu đặt phòng': 'Look up my booking',
    'Không còn phòng phù hợp trong thời gian đã chọn.': 'No rooms available for the selected dates.',
    // lookup / bookings
    'Tra cứu đặt phòng của bạn': 'Look up your booking',
    'Lịch sử đặt phòng': 'My bookings', 'Tổng quan': 'Overview', 'Hồ sơ': 'Profile', 'Hỗ trợ': 'Support',
    'Bạn chưa có đặt phòng.': 'You have no bookings yet.',
    'Hủy': 'Cancel', 'Sửa': 'Edit', 'Đánh giá': 'Review', 'Thanh toán online': 'Pay online',
    'Xem chi tiết': 'View details',
    // profile
    'Thông tin cá nhân': 'Personal details', 'Lưu thay đổi': 'Save changes',
    'Đổi mật khẩu': 'Change password', 'Mật khẩu hiện tại': 'Current password', 'Mật khẩu mới': 'New password',
    // chat
    'Hỗ trợ trực tuyến': 'Live support', 'Nhập câu hỏi…': 'Type your question…', 'Gửi': 'Send',
    'Hãy gửi câu hỏi đầu tiên cho lễ tân.': 'Send your first question to the front desk.',
    // misc
    'Đang tải…': 'Loading…',
  },
};

let currentLang = localStorage.getItem('portal_lang') || 'vi';

export function getLang() { return currentLang; }

export function setLang(lang) {
  currentLang = DICTS[lang] ? lang : 'vi';
  localStorage.setItem('portal_lang', currentLang);
}

// t(viText) → dịch; chuỗi gốc chính là key tiếng Việt.
export function t(text) {
  if (currentLang === 'en') return DICTS.en[text] || text;
  return text;
}

// Ngôn ngữ hiển thị trong header
export function langSwitcher() {
  const wrap = document.createElement('select');
  wrap.className = 'portal-lang';
  wrap.setAttribute('aria-label', 'Language');
  for (const [value, label] of [['vi', '🇻🇳 VI'], ['en', '🇬🇧 EN']]) {
    const opt = document.createElement('option');
    opt.value = value; opt.textContent = label;
    if (value === currentLang) opt.selected = true;
    wrap.appendChild(opt);
  }
  wrap.addEventListener('change', () => { setLang(wrap.value); location.reload(); });
  return wrap;
}
