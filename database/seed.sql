-- ============================================================
-- Hotel Management System — Seed Data
-- File: database/seed.sql
-- Run AFTER schema.sql:  mysql -u root -p hotel_db < seed.sql
-- ============================================================
USE hotel_db;

-- Clear existing data (order does not matter with FK checks disabled)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE TIN_NHAN;
TRUNCATE TABLE CUOC_TRO_CHUYEN;
TRUNCATE TABLE NHAT_KY;
TRUNCATE TABLE DANH_GIA;
TRUNCATE TABLE CA_LAM_VIEC;
TRUNCATE TABLE THANH_TOAN;
TRUNCATE TABLE HOA_DON;
TRUNCATE TABLE SU_DUNG_DICH_VU;
TRUNCATE TABLE LICH_SU_PHONG;
TRUNCATE TABLE DAT_PHONG;
TRUNCATE TABLE DICH_VU;
TRUNCATE TABLE KHACH_HANG;
TRUNCATE TABLE XAC_THUC_KHACH;
TRUNCATE TABLE PHONG;
TRUNCATE TABLE LOAI_PHONG;
TRUNCATE TABLE MA_GIAM_GIA;
TRUNCATE TABLE NGUOI_DUNG;
TRUNCATE TABLE HOTEL_CONFIG;
TRUNCATE TABLE PASSWORD_RESET;
TRUNCATE TABLE AUTH_REVOKED_TOKEN;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- HOTEL_CONFIG (singleton) ----------
INSERT INTO HOTEL_CONFIG (id, ten_khach_san, dia_chi, vat, check_in_time, check_out_time, logo, no_show_deposit_policy, phi_tra_muon, nguong_duyet_hoan_tien)
VALUES (1, 'Khách Sạn Hoàng An', '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh', 0.1000, '14:00', '12:00', NULL, 'Giu', 200000.00, 1000000.00);

-- ---------- NGUOI_DUNG (staff — bcrypt hashed passwords) ----------
-- Test accounts: admin@hoangan.vn/admin123, manager@hoangan.vn/manager123, letan01@hoangan.vn/letan123
INSERT INTO NGUOI_DUNG (id, ho_ten, email, mat_khau_hash, vai_tro, trang_thai, so_lan_sai) VALUES
(1, 'Quản Trị Viên',  'admin@hoangan.vn',   '$2b$12$GP.bzM8gdNCxlmzWML7g8.wUikv1xSweproCi/JmnstABlM3CEoyC', 'Admin',  'Active', 0),
(2, 'Nguyễn Quản Lý', 'manager@hoangan.vn', '$2b$12$nZXcgU2C.yg6Pf4Vqn936O4XKjREVJo3qoP2aS8FozhA.5T/IvIFm', 'QuanLy', 'Active', 0),
(3, 'Trần Lễ Tân',    'letan01@hoangan.vn', '$2b$12$4WZpz5YBmoKjD2.nn60Yl.VoD6MRRBs/Lc4TaqslBGETBg8HnVBJi', 'LeTan',  'Active', 0);

-- ---------- LOAI_PHONG (5 room types, with guest capacity) ----------
INSERT INTO LOAI_PHONG (id, ten_loai_phong, mo_ta, gia_mac_dinh, suc_chua, hinh_anh) VALUES
(1, 'Standard', 'Phòng tiêu chuẩn 20m², giường đôi, WiFi, TV, điều hòa',     500000.00,  2, NULL),
(2, 'Superior', 'Phòng cao cấp 25m², view thành phố, minibar',              800000.00,  2, NULL),
(3, 'Deluxe',   'Phòng deluxe 30m², ban công, bồn tắm, view hồ bơi',       1200000.00,  3, NULL),
(4, 'Suite',    'Phòng suite 45m², phòng khách riêng, bồn tắm Jacuzzi',    2000000.00,  4, NULL),
(5, 'VIP',      'Phòng VIP 60m², terrace riêng, butler, ăn sáng miễn phí', 3500000.00,  6, NULL);

-- ---------- PHONG (10 rooms across all 5 statuses) ----------
INSERT INTO PHONG (id, so_phong, loai_phong_id, trang_thai) VALUES
(1,  '101', 1, 'Trong'),
(2,  '102', 1, 'DaDat'),
(3,  '103', 2, 'DangO'),
(4,  '104', 2, 'Trong'),
(5,  '201', 3, 'DangDon'),
(6,  '202', 3, 'BaoTri'),
(7,  '203', 4, 'Trong'),
(8,  '204', 4, 'DaDat'),
(9,  '301', 5, 'Trong'),
(10, '302', 5, 'DangO');

-- ---------- KHACH_HANG (5 customers, 2 with portal accounts) ----------
-- Portal test accounts: an.nguyen@email.com/khach123 (verified), john.smith@email.com/khach456 (verified)
INSERT INTO KHACH_HANG (id, ho_ten, sdt, email, cccd_passport, quoc_tich, dia_chi, ghi_chu, mat_khau_hash, email_verified) VALUES
(1, 'Nguyễn Văn An',     '0901234567', 'an.nguyen@email.com',    '001234567890', 'Việt Nam', '45 Nguyễn Huệ, Q1, TP.HCM', 'Khách quen, hay đặt phòng Deluxe', '$2b$12$GV58i5PH3eJwhbW5SDL4ou2oy7/3pR533ooFE7yLA7UT.v3OYVtKK', TRUE),
(2, 'Trần Thị Bình',     '0902345678', 'binh.tran@email.com',    '001234567891', 'Việt Nam', '12 Lê Lợi, Q1, TP.HCM',     NULL, NULL, FALSE),
(3, 'Lê Hoàng Cường',    '0903456789', 'cuong.le@email.com',     'B123456789',   'Việt Nam', '78 Đống Đa, Q10, TP.HCM',   'Doanh nhân, thích phòng VIP', NULL, FALSE),
(4, 'Phạm Thị Dung',     '0904567890', 'dung.pham@email.com',    '001234567892', 'Việt Nam', '34 Trần Hưng Đạo, Q5, TP.HCM', NULL, NULL, FALSE),
(5, 'John Smith',        '0905678901', 'john.smith@email.com',   'P12345678',    'United States', '22 Pasteur, Q3, TP.HCM', 'Khách nước ngoài', '$2b$12$CHmlRXCmH6sVTCqE0AGvk..XgJ1RT/.ix4v.BBfszuZCdIqDN5lW.', TRUE);

-- ---------- DICH_VU (5 services, mixed Active/Inactive) ----------
INSERT INTO DICH_VU (id, ten_dich_vu, don_gia, don_vi_tinh, trang_thai) VALUES
(1, 'Ăn sáng buffet',    150000.00, 'suất',  'Active'),
(2, 'Giặt ủi',           50000.00,  'món',   'Active'),
(3, 'Spa massage',       500000.00, 'phiên', 'Active'),
(4, 'Đưa đón sân bay',   300000.00, 'chuyến','Active'),
(5, 'Thuê xe đạp',        80000.00, 'giờ',   'Inactive');

-- ---------- MA_GIAM_GIA (4 promo codes: active, expiring, expired, exhausted) ----------
INSERT INTO MA_GIAM_GIA (id, ma, phan_tram, ngay_bat_dau, ngay_ket_thuc, gioi_han_su_dung, so_lan_da_dung, gia_tri_toi_thieu, trang_thai) VALUES
(1, 'WELCOME10', 10.00, NULL,       NULL,       NULL, 0, NULL,      'Active'),
(2, 'VIP30',     30.00, '2026-01-01','2026-12-31', 100, 0, 2000000.00, 'Active'),
(3, 'EXPIRED50', 50.00, '2025-01-01','2025-06-30', NULL, 0, NULL,     'Active'),
(4, 'HETHAN20',  20.00, NULL,       NULL,       2,    2, NULL,      'Active');

-- ---------- DAT_PHONG (6 bookings covering all 6 statuses) ----------
INSERT INTO DAT_PHONG (id, khach_hang_id, phong_id, nguoi_dung_id, ngay_check_in, ngay_check_out, tien_coc, trang_thai, thoi_gian_check_in_thuc, ma_giam_gia_id) VALUES
-- ChoXacNhan: pending confirmation
(1, 1, 1, 3, '2026-09-15', '2026-09-18', 500000.00,  'ChoXacNhan', NULL,                    NULL),
-- DaDat: confirmed, room 102 is DaDat
(2, 2, 2, 3, '2026-09-10', '2026-09-13', 800000.00,  'DaDat',      NULL,                    NULL),
-- DangO: currently staying, room 103 is DangO, has actual check-in time
(3, 3, 3, 3, '2026-09-08', '2026-09-12', 1200000.00, 'DangO',      '2026-09-08 14:30:00',  NULL),
-- DaTra: completed stay, room 201 is DangDon (cleaning)
(4, 4, 5, 3, '2026-09-01', '2026-09-05', 800000.00,  'DaTra',      '2026-09-01 14:00:00',  1),
-- Huy: cancelled
(5, 1, 7, 3, '2026-09-20', '2026-09-22', 0.00,        'Huy',        NULL,                    NULL),
-- NoShow: did not show up
(6, 5, 9, 3, '2026-09-05', '2026-09-07', 0.00,        'NoShow',     NULL,                    NULL);

-- ---------- SU_DUNG_DICH_VU (services used by the DangO and DaTra bookings) ----------
INSERT INTO SU_DUNG_DICH_VU (id, dat_phong_id, dich_vu_id, so_luong, thanh_tien) VALUES
(1, 3, 1, 4, 600000.00),   -- 4 breakfasts for booking 3 (DangO)
(2, 3, 2, 2, 100000.00),   -- 2 laundry items for booking 3
(3, 4, 1, 5, 750000.00),   -- 5 breakfasts for booking 4 (DaTra)
(4, 4, 3, 1, 500000.00);   -- 1 spa session for booking 4

-- ---------- HOA_DON (invoice for the DaTra booking 4) ----------
-- Booking 4: room 201 (Deluxe 1,200,000) × 4 nights = 4,800,000 room
-- Services: 750,000 + 500,000 = 1,250,000
-- Subtotal: 6,050,000; VAT 10%: 605,000; Gross: 6,655,000
-- Promo WELCOME10 (-10%): 5,989,500; Deposit: 800,000; Payable: 5,189,500
INSERT INTO HOA_DON (id, dat_phong_id, tong_tien_phong, tong_tien_dich_vu, thue_vat, tong_cong, trang_thai_thanh_toan) VALUES
(1, 4, 4800000.00, 1250000.00, 605000.00, 5189500.00, 'DaThanhToan');

-- ---------- LICH_SU_PHONG (stay segments used by billing) ----------
INSERT INTO LICH_SU_PHONG (id, dat_phong_id, phong_id, tu_ngay, den_ngay, don_gia) VALUES
(1, 3, 3, '2026-09-08', '2026-09-12', 800000.00),
(2, 4, 5, '2026-09-01', '2026-09-05', 1200000.00);

-- ---------- THANH_TOAN (payments for invoice 1) ----------
INSERT INTO THANH_TOAN (id, hoa_don_id, so_tien, hinh_thuc, thoi_gian, ghi_chu, nguoi_dung_id, ca_lam_viec_id) VALUES
(1, 1, 2000000.00, 'TienMat',    '2026-09-03 10:00:00', 'Thanh toán lần 1',   3, 1),
(2, 1, 3189500.00, 'ChuyenKhoan','2026-09-04 14:00:00', 'Thanh toán còn lại', 3, 1);

-- ---------- CA_LAM_VIEC (1 open shift for LeTan) ----------
INSERT INTO CA_LAM_VIEC (id, nguoi_dung_id, gio_mo_ca, gio_dong_ca, tien_mat_dau_ca, tien_mat_cuoi_ca, chenh_lech) VALUES
(1, 3, '2026-09-11 08:00:00', NULL, 5000000.00, NULL, NULL);

-- ---------- DANH_GIA (1 review pending approval) ----------
INSERT INTO DANH_GIA (id, khach_hang_id, dat_phong_id, so_sao, noi_dung, trang_thai_duyet) VALUES
(1, 4, 4, 5, 'Phòng rất sạch, nhân viên nhiệt tình, sẽ quay lại!', 'ChoDuyet');

-- ---------- CUOC_TRO_CHUYEN + TIN_NHAN (1 sample conversation with 2 messages) ----------
INSERT INTO CUOC_TRO_CHUYEN (id, khach_hang_id, trang_thai, created_at, updated_at) VALUES
(1, 1, 'Pending', '2026-09-11 09:00:00', '2026-09-11 09:00:00');

INSERT INTO TIN_NHAN (id, conversation_id, sender_role, noi_dung, thoi_gian, is_read) VALUES
(1, 1, 'Customer', 'Xin chào, tôi muốn hỏi về giờ nhận phòng.',     '2026-09-11 09:00:00', FALSE),
(2, 1, 'Staff',    'Chào quý khách, giờ nhận phòng là 14:00 và trả phòng là 12:00 ạ.', '2026-09-11 09:02:00', FALSE);

-- ---------- NHAT_KY (sample audit entries) ----------
INSERT INTO NHAT_KY (thoi_gian, nguoi_dung, hanh_dong, chi_tiet) VALUES
('2026-09-01 08:00:00', 'Trần Lễ Tân',  'open_shift',  'Mở ca làm việc, tiền mặt đầu ca: 5,000,000'),
('2026-09-01 14:00:00', 'Trần Lễ Tân',  'check_in',    'Nhận phòng booking #4 cho khách Phạm Thị Dung'),
('2026-09-03 10:00:00', 'Trần Lễ Tân',  'payment',     'Thanh toán 2,000,000 cho hóa đơn #1, hình thức: Tiền mặt'),
('2026-09-04 14:00:00', 'Trần Lễ Tân',  'payment',     'Thanh toán 1,685,500 cho hóa đơn #1, hình thức: Chuyển khoản'),
('2026-09-05 11:00:00', 'Trần Lễ Tân',  'check_out',   'Trả phòng booking #4, phòng 201 → DangDon');
