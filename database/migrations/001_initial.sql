-- ============================================================
-- Hotel Management System — Schema DDL (MySQL 8.0)
-- File: database/schema.sql
-- ============================================================
CREATE DATABASE IF NOT EXISTS hotel_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_db;

-- Drop tables in reverse dependency order (for clean re-creation)
DROP TABLE IF EXISTS NHAT_KY;
DROP TABLE IF EXISTS DANH_GIA;
DROP TABLE IF EXISTS CA_LAM_VIEC;
DROP TABLE IF EXISTS THANH_TOAN;
DROP TABLE IF EXISTS HOA_DON;
DROP TABLE IF EXISTS SU_DUNG_DICH_VU;
DROP TABLE IF EXISTS DAT_PHONG;
DROP TABLE IF EXISTS DICH_VU;
DROP TABLE IF EXISTS KHACH_HANG;
DROP TABLE IF EXISTS PHONG;
DROP TABLE IF EXISTS LOAI_PHONG;
DROP TABLE IF EXISTS MA_GIAM_GIA;
DROP TABLE IF EXISTS NGUOI_DUNG;
DROP TABLE IF EXISTS HOTEL_CONFIG;

-- ---------- HOTEL_CONFIG (singleton row, id=1) ----------
CREATE TABLE HOTEL_CONFIG (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  ten_khach_san VARCHAR(200) NOT NULL,
  dia_chi       VARCHAR(300) NOT NULL,
  vat           DECIMAL(5,4) NOT NULL CHECK (vat >= 0 AND vat <= 1),
  check_in_time VARCHAR(5)   NOT NULL DEFAULT '14:00',
  check_out_time VARCHAR(5)  NOT NULL DEFAULT '12:00',
  logo          VARCHAR(500)
) ENGINE=InnoDB;

-- ---------- NGUOI_DUNG (staff) ----------
CREATE TABLE NGUOI_DUNG (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  ho_ten         VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  mat_khau_hash  VARCHAR(255) NOT NULL,
  vai_tro         ENUM('Admin','QuanLy','LeTan') NOT NULL,
  trang_thai     ENUM('Active','Locked') NOT NULL DEFAULT 'Active',
  so_lan_sai     INT NOT NULL DEFAULT 0 CHECK (so_lan_sai >= 0),
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- LOAI_PHONG ----------
CREATE TABLE LOAI_PHONG (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  ten_loai_phong  VARCHAR(100) NOT NULL,
  mo_ta           TEXT,
  gia_mac_dinh    DECIMAL(12,2) NOT NULL CHECK (gia_mac_dinh > 0),
  hinh_anh        VARCHAR(500)
) ENGINE=InnoDB;

-- ---------- PHONG ----------
CREATE TABLE PHONG (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  so_phong      VARCHAR(10) NOT NULL UNIQUE,
  loai_phong_id INT NOT NULL,
  trang_thai    ENUM('Trong','DaDat','DangO','DangDon','BaoTri') NOT NULL DEFAULT 'Trong',
  CONSTRAINT fk_phong_loai FOREIGN KEY (loai_phong_id) REFERENCES LOAI_PHONG(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ---------- KHACH_HANG ----------
CREATE TABLE KHACH_HANG (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  ho_ten        VARCHAR(100) NOT NULL,
  sdt           VARCHAR(20) NOT NULL,
  email         VARCHAR(150),
  cccd_passport VARCHAR(30) NOT NULL UNIQUE,
  quoc_tich     VARCHAR(50) NOT NULL DEFAULT 'Việt Nam',
  dia_chi       VARCHAR(300),
  ghi_chu       TEXT,
  mat_khau_hash VARCHAR(255),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- MA_GIAM_GIA ----------
CREATE TABLE MA_GIAM_GIA (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  ma         VARCHAR(50) NOT NULL UNIQUE,
  phan_tram  DECIMAL(5,2) NOT NULL CHECK (phan_tram >= 0 AND phan_tram <= 100),
  trang_thai ENUM('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB;

-- ---------- DAT_PHONG ----------
CREATE TABLE DAT_PHONG (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  khach_hang_id          INT NOT NULL,
  phong_id               INT NOT NULL,
  nguoi_dung_id          INT,
  ngay_check_in          DATE NOT NULL,
  ngay_check_out         DATE NOT NULL,
  tien_coc               DECIMAL(12,2) DEFAULT 0 CHECK (tien_coc >= 0),
  trang_thai             ENUM('ChoXacNhan','DaDat','DangO','DaTra','Huy','NoShow') NOT NULL DEFAULT 'ChoXacNhan',
  thoi_gian_check_in_thuc DATETIME,
  ma_giam_gia_id         INT,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dp_khach FOREIGN KEY (khach_hang_id) REFERENCES KHACH_HANG(id),
  CONSTRAINT fk_dp_phong FOREIGN KEY (phong_id) REFERENCES PHONG(id),
  CONSTRAINT fk_dp_nguoi FOREIGN KEY (nguoi_dung_id) REFERENCES NGUOI_DUNG(id),
  CONSTRAINT fk_dp_promo FOREIGN KEY (ma_giam_gia_id) REFERENCES MA_GIAM_GIA(id),
  CONSTRAINT chk_dp_dates CHECK (ngay_check_out > ngay_check_in)
) ENGINE=InnoDB;

-- ---------- DICH_VU ----------
CREATE TABLE DICH_VU (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  ten_dich_vu  VARCHAR(100) NOT NULL,
  don_gia      DECIMAL(12,2) NOT NULL CHECK (don_gia > 0),
  don_vi_tinh  VARCHAR(20) NOT NULL,
  trang_thai   ENUM('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB;

-- ---------- SU_DUNG_DICH_VU ----------
CREATE TABLE SU_DUNG_DICH_VU (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  dat_phong_id INT NOT NULL,
  dich_vu_id   INT NOT NULL,
  so_luong     INT NOT NULL CHECK (so_luong > 0),
  thanh_tien   DECIMAL(12,2) NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sddv_dp FOREIGN KEY (dat_phong_id) REFERENCES DAT_PHONG(id) ON DELETE CASCADE,
  CONSTRAINT fk_sddv_dv FOREIGN KEY (dich_vu_id) REFERENCES DICH_VU(id)
) ENGINE=InnoDB;

-- ---------- HOA_DON ----------
CREATE TABLE HOA_DON (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  dat_phong_id           INT NOT NULL UNIQUE,
  tong_tien_phong        DECIMAL(12,2) NOT NULL DEFAULT 0,
  tong_tien_dich_vu      DECIMAL(12,2) NOT NULL DEFAULT 0,
  thue_vat               DECIMAL(12,2) NOT NULL DEFAULT 0,
  tong_cong              DECIMAL(12,2) NOT NULL DEFAULT 0,
  trang_thai_thanh_toan  ENUM('ChuaThanhToan','ThanhToanMotPhan','DaThanhToan') NOT NULL DEFAULT 'ChuaThanhToan',
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hd_dp FOREIGN KEY (dat_phong_id) REFERENCES DAT_PHONG(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------- THANH_TOAN ----------
CREATE TABLE THANH_TOAN (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  hoa_don_id INT NOT NULL,
  so_tien    DECIMAL(12,2) NOT NULL CHECK (so_tien > 0),
  hinh_thuc  ENUM('TienMat','ChuyenKhoan','The') NOT NULL,
  thoi_gian  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ghi_chu    VARCHAR(300),
  CONSTRAINT fk_tt_hd FOREIGN KEY (hoa_don_id) REFERENCES HOA_DON(id)
) ENGINE=InnoDB;

-- ---------- CA_LAM_VIEC ----------
CREATE TABLE CA_LAM_VIEC (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  nguoi_dung_id     INT NOT NULL,
  gio_mo_ca         DATETIME NOT NULL,
  gio_dong_ca       DATETIME,
  tien_mat_dau_ca   DECIMAL(12,2) NOT NULL CHECK (tien_mat_dau_ca >= 0),
  tien_mat_cuoi_ca  DECIMAL(12,2),
  chenh_lech        DECIMAL(12,2),
  CONSTRAINT fk_clv_nd FOREIGN KEY (nguoi_dung_id) REFERENCES NGUOI_DUNG(id)
) ENGINE=InnoDB;

-- ---------- DANH_GIA ----------
CREATE TABLE DANH_GIA (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  khach_hang_id    INT NOT NULL,
  dat_phong_id     INT NOT NULL,
  so_sao           TINYINT NOT NULL CHECK (so_sao BETWEEN 1 AND 5),
  noi_dung         TEXT,
  trang_thai_duyet ENUM('ChoDuyet','DaDuyet','TuChoi') NOT NULL DEFAULT 'ChoDuyet',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dg_khach FOREIGN KEY (khach_hang_id) REFERENCES KHACH_HANG(id),
  CONSTRAINT fk_dg_dp FOREIGN KEY (dat_phong_id) REFERENCES DAT_PHONG(id)
) ENGINE=InnoDB;

-- ---------- NHAT_KY (audit log — immutable, no UPDATE/DELETE path) ----------
CREATE TABLE NHAT_KY (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  thoi_gian  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nguoi_dung VARCHAR(100) NOT NULL,
  hanh_dong  VARCHAR(100) NOT NULL,
  chi_tiet   TEXT
) ENGINE=InnoDB;

-- ============================================================
-- INDEXES (DB-04)
-- ============================================================
CREATE INDEX idx_phong_loai      ON PHONG(loai_phong_id);
CREATE INDEX idx_phong_trangthai ON PHONG(trang_thai);
CREATE INDEX idx_khach_sdt       ON KHACH_HANG(sdt);
CREATE INDEX idx_khach_email     ON KHACH_HANG(email);
CREATE INDEX idx_dp_khach        ON DAT_PHONG(khach_hang_id);
CREATE INDEX idx_dp_phong        ON DAT_PHONG(phong_id);
CREATE INDEX idx_dp_trangthai    ON DAT_PHONG(trang_thai);
CREATE INDEX idx_dp_checkin      ON DAT_PHONG(ngay_check_in);
CREATE INDEX idx_dp_checkout     ON DAT_PHONG(ngay_check_out);
CREATE INDEX idx_sddv_dp         ON SU_DUNG_DICH_VU(dat_phong_id);
CREATE INDEX idx_tt_hd           ON THANH_TOAN(hoa_don_id);
CREATE INDEX idx_tt_thoigian     ON THANH_TOAN(thoi_gian);
CREATE INDEX idx_clv_nd          ON CA_LAM_VIEC(nguoi_dung_id);
CREATE INDEX idx_dg_trangthai    ON DANH_GIA(trang_thai_duyet);
CREATE INDEX idx_nk_thoigian     ON NHAT_KY(thoi_gian);
CREATE INDEX idx_nk_nguoidung    ON NHAT_KY(nguoi_dung);
