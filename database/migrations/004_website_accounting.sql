-- Apply once after 003. Brings an existing hotel_db to parity with schema.sql:
-- chat tables, customer account verification, promo validity windows, review
-- uniqueness, room-type capacity, refund approval threshold.
-- Idempotency: uses IF NOT EXISTS where supported; column adds will error if
-- re-applied, which is expected for a forward-only migration.

-- Chat tables (previously only in schema.sql, missing from the migration path)
CREATE TABLE IF NOT EXISTS CUOC_TRO_CHUYEN (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  khach_hang_id INT NOT NULL,
  trang_thai    ENUM('Pending','Answered') NOT NULL DEFAULT 'Pending',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ctc_khach FOREIGN KEY (khach_hang_id) REFERENCES KHACH_HANG(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS TIN_NHAN (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_role     ENUM('Customer','Staff') NOT NULL,
  noi_dung        TEXT NOT NULL,
  thoi_gian       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_tn_ctc FOREIGN KEY (conversation_id) REFERENCES CUOC_TRO_CHUYEN(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE INDEX idx_tn_conversation ON TIN_NHAN(conversation_id);
CREATE INDEX idx_tn_thoigian ON TIN_NHAN(thoi_gian);
CREATE INDEX idx_ctc_trangthai ON CUOC_TRO_CHUYEN(trang_thai);

-- Customer portal accounts: verification flag + login lockout
ALTER TABLE KHACH_HANG
  ADD email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD trang_thai ENUM('Active','Locked') NOT NULL DEFAULT 'Active',
  ADD so_lan_sai INT NOT NULL DEFAULT 0 CHECK (so_lan_sai >= 0);

CREATE TABLE IF NOT EXISTS XAC_THUC_KHACH (
  token_hash    CHAR(64) PRIMARY KEY,
  khach_hang_id INT NOT NULL,
  expires_at    DATETIME NOT NULL,
  used_at       DATETIME NULL,
  CONSTRAINT fk_xtk_khach FOREIGN KEY (khach_hang_id) REFERENCES KHACH_HANG(id) ON DELETE CASCADE,
  INDEX idx_xtk_khach (khach_hang_id)
) ENGINE=InnoDB;

-- Promo validity: window, usage quota, minimum order value
ALTER TABLE MA_GIAM_GIA
  ADD ngay_bat_dau DATE NULL,
  ADD ngay_ket_thuc DATE NULL,
  ADD gioi_han_su_dung INT NULL CHECK (gioi_han_su_dung IS NULL OR gioi_han_su_dung > 0),
  ADD so_lan_da_dung INT NOT NULL DEFAULT 0 CHECK (so_lan_da_dung >= 0),
  ADD gia_tri_toi_thieu DECIMAL(12,2) NULL CHECK (gia_tri_toi_thieu IS NULL OR gia_tri_toi_thieu >= 0);

-- One review per completed booking
ALTER TABLE DANH_GIA ADD CONSTRAINT uq_dg_dat_phong UNIQUE (dat_phong_id);

-- Room-type guest capacity (validated against DAT_PHONG.so_khach)
ALTER TABLE LOAI_PHONG ADD suc_chua INT NOT NULL DEFAULT 2 CHECK (suc_chua > 0);

-- Refunds above this amount require QuanLy/Admin approval (US-28)
ALTER TABLE HOTEL_CONFIG ADD nguong_duyet_hoan_tien DECIMAL(12,2) NOT NULL DEFAULT 1000000;
