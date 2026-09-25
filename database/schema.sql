-- ============================================================
-- Hotel Management System — Schema DDL (MySQL 8.0)
-- File: database/schema.sql
-- ============================================================
CREATE DATABASE IF NOT EXISTS hotel_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_db;

-- Drop tables in reverse dependency order (for clean re-creation).
-- Token tables must drop first: PASSWORD_RESET holds an FK to NGUOI_DUNG,
-- XAC_THUC_KHACH holds an FK to KHACH_HANG.
DROP TABLE IF EXISTS PASSWORD_RESET;
DROP TABLE IF EXISTS AUTH_REVOKED_TOKEN;
DROP TABLE IF EXISTS XAC_THUC_KHACH;
DROP TABLE IF EXISTS TIN_NHAN;
DROP TABLE IF EXISTS CUOC_TRO_CHUYEN;
DROP TABLE IF EXISTS NHAT_KY;
DROP TABLE IF EXISTS DANH_GIA;
DROP TABLE IF EXISTS CA_LAM_VIEC;
DROP TABLE IF EXISTS THANH_TOAN;
DROP TABLE IF EXISTS HOA_DON;
DROP TABLE IF EXISTS SU_DUNG_DICH_VU;
DROP TABLE IF EXISTS LICH_SU_PHONG;
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
  logo          VARCHAR(500),
  no_show_deposit_policy ENUM('Giu','Hoan') NOT NULL DEFAULT 'Giu',
  phi_tra_muon DECIMAL(12,2) NOT NULL DEFAULT 0,
  ma_hoa_don_mau VARCHAR(50) NOT NULL DEFAULT 'HD',
  nguong_duyet_hoan_tien DECIMAL(12,2) NOT NULL DEFAULT 1000000
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
  suc_chua        INT NOT NULL DEFAULT 2 CHECK (suc_chua > 0),
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
-- trang_thai/so_lan_sai drive customer login lockout (same policy as staff);
-- email_verified gates the account until the verification link is consumed.
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
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  trang_thai    ENUM('Active','Locked') NOT NULL DEFAULT 'Active',
  so_lan_sai    INT NOT NULL DEFAULT 0 CHECK (so_lan_sai >= 0),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- XAC_THUC_KHACH (customer account verification tokens) ----------
CREATE TABLE XAC_THUC_KHACH (
  token_hash    CHAR(64) PRIMARY KEY,
  khach_hang_id INT NOT NULL,
  expires_at    DATETIME NOT NULL,
  used_at       DATETIME NULL,
  CONSTRAINT fk_xtk_khach FOREIGN KEY (khach_hang_id) REFERENCES KHACH_HANG(id) ON DELETE CASCADE,
  INDEX idx_xtk_khach (khach_hang_id)
) ENGINE=InnoDB;

-- ---------- MA_GIAM_GIA ----------
-- Validity window + usage quota: a code outside [ngay_bat_dau, ngay_ket_thuc]
-- or with so_lan_da_dung >= gioi_han_su_dung is rejected with a clear error.
CREATE TABLE MA_GIAM_GIA (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  ma              VARCHAR(50) NOT NULL UNIQUE,
  phan_tram       DECIMAL(5,2) NOT NULL CHECK (phan_tram >= 0 AND phan_tram <= 100),
  ngay_bat_dau    DATE NULL,
  ngay_ket_thuc   DATE NULL,
  gioi_han_su_dung INT NULL CHECK (gioi_han_su_dung IS NULL OR gioi_han_su_dung > 0),
  so_lan_da_dung  INT NOT NULL DEFAULT 0 CHECK (so_lan_da_dung >= 0),
  gia_tri_toi_thieu DECIMAL(12,2) NULL CHECK (gia_tri_toi_thieu IS NULL OR gia_tri_toi_thieu >= 0),
  trang_thai      ENUM('Active','Inactive') NOT NULL DEFAULT 'Active'
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
  so_khach INT NOT NULL DEFAULT 1 CHECK (so_khach BETWEEN 1 AND 100),
  nguon_dat ENUM('LeTan','Online') NOT NULL DEFAULT 'LeTan',
  phu_phi_tra_muon DECIMAL(12,2) NOT NULL DEFAULT 0,
  tien_coc_da_hoan DECIMAL(12,2) NOT NULL DEFAULT 0,
  chinh_sach_coc ENUM('Giu','Hoan') NULL,
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
  so_tien    DECIMAL(12,2) NOT NULL CHECK (so_tien <> 0),
  hinh_thuc  ENUM('TienMat','ChuyenKhoan','The') NOT NULL,
  thoi_gian  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ghi_chu    VARCHAR(300),
  nguoi_dung_id INT NULL,
  ca_lam_viec_id INT NULL,
  hoan_cho_id INT NULL,
  CONSTRAINT fk_tt_staff FOREIGN KEY (nguoi_dung_id) REFERENCES NGUOI_DUNG(id),
  CONSTRAINT fk_tt_refund FOREIGN KEY (hoan_cho_id) REFERENCES THANH_TOAN(id),
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
  CONSTRAINT fk_dg_dp FOREIGN KEY (dat_phong_id) REFERENCES DAT_PHONG(id),
  CONSTRAINT uq_dg_dat_phong UNIQUE (dat_phong_id)
) ENGINE=InnoDB;

-- ---------- NHAT_KY (audit log — immutable, no UPDATE/DELETE path) ----------
CREATE TABLE NHAT_KY (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  thoi_gian  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nguoi_dung VARCHAR(100) NOT NULL,
  hanh_dong  VARCHAR(100) NOT NULL,
  chi_tiet   TEXT
) ENGINE=InnoDB;

-- ---------- CUOC_TRO_CHUYEN (chat conversations) ----------
CREATE TABLE CUOC_TRO_CHUYEN (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  khach_hang_id INT NOT NULL,
  trang_thai    ENUM('Pending','Answered') NOT NULL DEFAULT 'Pending',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ctc_khach FOREIGN KEY (khach_hang_id) REFERENCES KHACH_HANG(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- TIN_NHAN (chat messages) ----------
CREATE TABLE TIN_NHAN (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_role     ENUM('Customer','Staff') NOT NULL,
  noi_dung        TEXT NOT NULL,
  thoi_gian       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_tn_ctc FOREIGN KEY (conversation_id) REFERENCES CUOC_TRO_CHUYEN(id) ON DELETE CASCADE
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
CREATE INDEX idx_tn_conversation ON TIN_NHAN(conversation_id);
CREATE INDEX idx_tn_thoigian     ON TIN_NHAN(thoi_gian);
CREATE INDEX idx_ctc_trangthai   ON CUOC_TRO_CHUYEN(trang_thai);

CREATE TABLE AUTH_REVOKED_TOKEN (
  token_hash CHAR(64) PRIMARY KEY,
  expires_at DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE PASSWORD_RESET (
  token_hash CHAR(64) PRIMARY KEY,
  nguoi_dung_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  INDEX idx_reset_user (nguoi_dung_id)
) ENGINE=InnoDB;

CREATE TABLE LICH_SU_PHONG (
 id INT AUTO_INCREMENT PRIMARY KEY, dat_phong_id INT NOT NULL, phong_id INT NOT NULL,
 tu_ngay DATE NOT NULL, den_ngay DATE NOT NULL, don_gia DECIMAL(12,2) NOT NULL,
 FOREIGN KEY(dat_phong_id) REFERENCES DAT_PHONG(id) ON DELETE CASCADE,
 FOREIGN KEY(phong_id) REFERENCES PHONG(id), CHECK(den_ngay >= tu_ngay)
) ENGINE=InnoDB;
