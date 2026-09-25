export const credentials = {
  admin: { email: 'admin@hoangan.vn', password: 'admin123' },
  quanly: { email: 'manager@hoangan.vn', password: 'manager123' },
  letan: { email: 'letan01@hoangan.vn', password: 'letan123' },
};

const FUTURE = '2026-10-';
export const futureDate = (day) => `${FUTURE}${String(day).padStart(2, '0')}`;

export const validRoomType = {
  ten_loai_phong: 'Test Deluxe',
  mo_ta: 'Test room type for verification',
  gia_mac_dinh: 900000,
};

export const validRoom = {
  so_phong: '999',
  loai_phong_id: 1,
  trang_thai: 'Trong',
};

export const validCustomer = {
  ho_ten: 'Test Customer Verification',
  sdt: '0987654321',
  email: 'test.verification@email.com',
  cccd_passport: 'TESTCCCD999',
  quoc_tich: 'Việt Nam',
  dia_chi: '123 Test Street',
};

export const validBooking = {
  khach_hang_id: 1,
  phong_id: 1,
  ngay_check_in: futureDate(10),
  ngay_check_out: futureDate(13),
  tien_coc: 500000,
};

export const validService = {
  ten_dich_vu: 'Test Service',
  don_gia: 100000,
  don_vi_tinh: 'lần',
  trang_thai: 'Active',
};

export const validReview = {
  so_sao: 5,
  noi_dung: 'Excellent stay, highly recommended!',
};

export const validShift = {
  tien_mat_dau_ca: 5000000,
};

export const duplicateRoom = { so_phong: '101', loai_phong_id: 1, trang_thai: 'Trong' };
export const duplicateCustomer = {
  ho_ten: 'Dup Customer',
  sdt: '0987654322',
  email: 'dup@email.com',
  cccd_passport: '001234567890',
  quoc_tich: 'Việt Nam',
};
export const invalidDateBooking = {
  khach_hang_id: 1,
  phong_id: 1,
  ngay_check_in: futureDate(15),
  ngay_check_out: futureDate(15),
  tien_coc: 0,
};
export const invalidDateBookingReversed = {
  khach_hang_id: 1,
  phong_id: 1,
  ngay_check_in: futureDate(20),
  ngay_check_out: futureDate(18),
  tien_coc: 0,
};
export const invalidReview = { so_sao: 6, noi_dung: 'invalid stars' };
export const invalidReviewZero = { so_sao: 0, noi_dung: 'zero stars' };

export const roles = ['Admin', 'QuanLy', 'LeTan'];
export const roomStatuses = ['Trong', 'DaDat', 'DangO', 'DangDon', 'BaoTri'];
export const bookingStatuses = ['ChoXacNhan', 'DaDat', 'DangO', 'DaTra', 'Huy', 'NoShow'];
export const paymentStatuses = ['ChuaThanhToan', 'ThanhToanMotPhan', 'DaThanhToan'];
export const serviceStatuses = ['Active', 'Inactive'];
export const reviewModerationStatuses = ['ChoDuyet', 'DaDuyet', 'TuChoi'];
