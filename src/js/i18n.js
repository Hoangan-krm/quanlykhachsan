// === I18N cho website khách hàng (NFR-11: tối thiểu tiếng Việt + tiếng Anh) ===
// Key chính là chuỗi tiếng Việt gốc; portal nhân viên vẫn thuần tiếng Việt.
const DICTS = {
    vi: null, // keys are the Vietnamese source text
    en: {
        // nav & shell
        'Khách sạn': 'Hotels', 'Tra cứu': 'My booking', 'Đăng nhập': 'Sign in', 'Đăng xuất': 'Sign out',
        'Hồ sơ của tôi': 'My profile', 'Lịch sử đặt phòng': 'My bookings',
        // home
        'Trải nghiệm kỳ nghỉ tuyệt vời': 'Experience a wonderful stay',
        'Combo khách sạn - nghỉ dưỡng đẳng cấp giá tốt nhất': 'Hotel + resort combos at the best prices',
        'Bạn muốn đi đâu?': 'Where do you want to go?',
        'Ngày đi': 'Check-in', 'Ngày về': 'Check-out', 'Tìm': 'Search',
        '1 Phòng': '1 Room', '2 người lớn, 0 trẻ em': '2 adults, 0 children',
        'Các Hạng Phòng Nổi Bật': 'Featured Room Types',
        'Xem Tất Cả Phòng': 'View all rooms',
        'Dịch Vụ Đẳng Cấp 5 Sao': '5-Star Services',
        'Giá từ': 'From', 'Đặt ngay': 'Book now', 'Đặt Phòng': 'Book now',
        // room list & search
        'Nhận phòng': 'Check-in', 'Trả phòng': 'Check-out',
        'Danh sách phòng': 'Rooms', 'Danh sách phòng (Khả dụng)': 'Rooms (Available)',
        'phòng trống': 'rooms available',
        'Không tìm thấy loại phòng nào trống trong thời gian này.': 'No room types available for these dates.',
        'Vui lòng chọn ngày': 'Please select dates',
        'Ngày trả phòng phải sau ngày nhận': 'Check-out must be after check-in',
        // booking modal
        'Xác nhận đặt phòng': 'Confirm booking',
        'Nhận phòng': 'Check-in', 'Trả phòng': 'Check-out',
        'Tổng tiền': 'Total', 'đêm': 'night(s)',
        'Thông tin khách hàng': 'Guest details',
        'Bạn đang đặt phòng với tư cách Khách.': 'You are booking as a guest.',
        'để quản lý dễ dàng hơn.': 'to manage your stay more easily.',
        'Họ tên *': 'Full name *', 'Số điện thoại *': 'Phone number *',
        'Email': 'Email', 'CMND/CCCD/Passport *': 'ID/Passport *',
        'Mã khuyến mãi (nếu có)': 'Promo code (optional)',
        'Áp dụng': 'Apply',
        'Thanh toán đặt cọc (50%)': 'Deposit payment (50%)',
        'Chuyển khoản': 'Bank transfer', 'Thẻ tín dụng': 'Credit card',
        'Hủy': 'Cancel', 'Thanh toán & Đặt phòng': 'Pay & Book',
        'Đang xử lý…': 'Processing…',
        'Đặt phòng thành công!': 'Booking confirmed!',
        // success modal
        'Đặt phòng thành công!': 'Booking successful!',
        'Mã đặt phòng': 'Booking code',
        'Trạng thái: Chờ xác nhận': 'Status: Pending confirmation',
        'Đặt phòng của bạn đã được đồng bộ với lễ tân khách sạn.': 'Your booking has been synced with the hotel front desk.',
        'Tiền cọc cần thanh toán': 'Deposit due',
        'Bạn có thể thanh toán cọc online ngay bên dưới.': 'You can pay the deposit online right below.',
        'Vui lòng thanh toán qua chuyển khoản hoặc tại quầy khi nhận phòng.': 'Please pay by bank transfer or at the front desk upon check-in.',
        'Thanh toán cọc online': 'Pay deposit online',
        'Xem lịch sử đặt phòng': 'View my bookings',
        'Tra cứu đặt phòng': 'Look up booking', 'Đóng': 'Close',
        // auth
        'Đăng nhập / Đăng ký': 'Sign in / Sign up', 'Dành cho Khách Hàng': 'For customers',
        'Số điện thoại hoặc Email': 'Phone number or Email', 'Mật khẩu': 'Password',
        'Tạo tài khoản mới': 'Create a new account',
        'Bạn là nhân viên?': 'Are you staff?',
        'Họ và tên *': 'Full name *', 'CMND/CCCD/Passport *': 'ID/Passport *',
        'Mật khẩu *': 'Password *',
        'Tối thiểu 8 ký tự, có chữ cái in hoa và chữ số.': 'Min 8 characters, one uppercase letter and one digit.',
        'Đăng ký': 'Sign up', 'Quay lại đăng nhập': 'Back to sign in',
        'Vui lòng điền đủ thông tin bắt buộc': 'Please fill in all required fields',
        // bookings
        'Chưa có đặt phòng nào.': 'You have no bookings yet.',
        'Tổng cộng': 'Total', 'Chưa lập': 'Not issued yet',
        'Sửa': 'Edit', 'Hủy phòng': 'Cancel booking', 'Đánh giá': 'Review', 'Thanh toán online': 'Pay online',
        'Bạn có chắc chắn muốn hủy đặt phòng này? (Tiền cọc sẽ được hoàn lại theo chính sách)': 'Cancel this booking? (Deposit will be refunded per policy)',
        'Hủy phòng thành công': 'Booking cancelled',
        'Cập nhật đặt phòng thành công': 'Booking updated',
        // booking statuses
        'Chờ xác nhận': 'Pending', 'Sắp tới': 'Upcoming', 'Đang ở': 'Occupied',
        'Đã hoàn thành': 'Completed', 'Đã hủy': 'Cancelled', 'Vắng mặt': 'No-show',
        // review modal
        'Đánh giá kỳ nghỉ': 'Review your stay',
        'Đánh giá sẽ hiển thị công khai sau khi được khách sạn duyệt.': 'Reviews appear publicly after hotel approval.',
        'Chia sẻ trải nghiệm của bạn…': 'Share your experience…',
        'Gửi đánh giá': 'Submit review',
        // profile
        'Thành viên HoangAn': 'HoangAn member',
        'Họ và tên': 'Full name', 'Số điện thoại': 'Phone number',
        'Đổi mật khẩu': 'Change password',
        'Mật khẩu hiện tại': 'Current password',
        'Mật khẩu mới (tối thiểu 8 ký tự, có chữ in hoa và chữ số)': 'New password (min 8 chars, one uppercase and one digit)',
        'Cập nhật hồ sơ': 'Update profile',
        'Cập nhật hồ sơ thành công': 'Profile updated',
        // reviews page
        'Đánh Giá Từ Khách Hàng': 'Guest Reviews',
        'Chưa có đánh giá nào.': 'No reviews yet.',
        'Khách đã lưu trú': 'Verified guest', 'Khách hàng': 'Guest',
        // lookup
        'Tra Cứu Đặt Phòng': 'Look Up Your Booking',
        'Nhập mã đặt phòng và số điện thoại/email đã dùng khi đặt.': 'Enter your booking code and the phone/email used to book.',
        'Mã đặt phòng *': 'Booking code *', 'Số điện thoại hoặc Email *': 'Phone or Email *',
        'Tra cứu': 'Search',
        'Đang tra cứu…': 'Searching…',
        'Không tìm thấy đặt phòng. Kiểm tra lại mã và thông tin liên hệ.': 'Booking not found. Check the code and contact info.',
        'Tiền cọc': 'Deposit', 'Chưa có hóa đơn.': 'No invoice yet.',
        // verify
        'Đang xác thực tài khoản…': 'Verifying your account…',
        'Xác thực thành công!': 'Verification successful!',
        'Tài khoản của bạn đã được kích hoạt. Hãy đăng nhập để đặt phòng.': 'Your account is now active. Sign in to book.',
        'Xác thực không thành công': 'Verification failed',
        'Về đăng nhập': 'Back to sign in',
        // misc
        'Đang tải…': 'Loading…', 'Đang tải danh sách phòng…': 'Loading rooms…',
        'Thử lại': 'Retry',
        'Đã đăng xuất': 'Signed out', 'Đăng nhập thành công': 'Signed in successfully',
        'Sai thông tin đăng nhập': 'Invalid credentials',
        'Vui lòng đăng nhập để trò chuyện với lễ tân': 'Sign in to chat with our receptionist',
    },
};

let currentLang = localStorage.getItem('HoangAn_LANG') || 'vi';

function getLang() { return currentLang; }

function setLang(lang) {
    currentLang = (lang === 'en') ? 'en' : 'vi';
    localStorage.setItem('HoangAn_LANG', currentLang);
}

// t(viText) → dịch; chuỗi gốc chính là key tiếng Việt.
function t(text) {
    if (currentLang === 'en') return DICTS.en[text] || text;
    return text;
}

// Nút chuyển ngôn ngữ (navbar)
const langToggle = () => `
    <select id="lang-toggle" onchange="switchLang(this.value)"
        class="bg-transparent text-white text-sm font-bold border border-white/30 rounded-md px-2 py-1.5 outline-none cursor-pointer [&>option]:text-gray-800"
        aria-label="Ngôn ngữ / Language">
        <option value="vi" ${currentLang === 'vi' ? 'selected' : ''}>VI</option>
        <option value="en" ${currentLang === 'en' ? 'selected' : ''}>EN</option>
    </select>
`;

function switchLang(lang) {
    setLang(lang);
    // Vẽ lại giao diện theo ngôn ngữ mới (giữ trang hiện tại bằng cách gọi lại view mặc định)
    renderCustomerApp();
}
