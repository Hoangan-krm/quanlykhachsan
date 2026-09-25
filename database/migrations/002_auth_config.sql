-- Apply once to an existing hotel_db. Does not remove business data.
CREATE TABLE IF NOT EXISTS AUTH_REVOKED_TOKEN (
  token_hash CHAR(64) PRIMARY KEY,
  expires_at DATETIME NOT NULL
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS PASSWORD_RESET (
  token_hash CHAR(64) PRIMARY KEY,
  nguoi_dung_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  INDEX idx_reset_user (nguoi_dung_id)
) ENGINE=InnoDB;
ALTER TABLE HOTEL_CONFIG ADD COLUMN ma_hoa_don_mau VARCHAR(50) NOT NULL DEFAULT 'HD';
