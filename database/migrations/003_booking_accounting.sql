-- Apply once after 002. Existing payments remain unattributed; new transactions carry staff and shift IDs.
ALTER TABLE HOTEL_CONFIG ADD no_show_deposit_policy ENUM('Giu','Hoan') NOT NULL DEFAULT 'Giu', ADD phi_tra_muon DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE DAT_PHONG ADD so_khach INT NOT NULL DEFAULT 1 CHECK (so_khach BETWEEN 1 AND 100), ADD nguon_dat ENUM('LeTan','Online') NOT NULL DEFAULT 'LeTan', ADD phu_phi_tra_muon DECIMAL(12,2) NOT NULL DEFAULT 0, ADD tien_coc_da_hoan DECIMAL(12,2) NOT NULL DEFAULT 0, ADD chinh_sach_coc ENUM('Giu','Hoan') NULL;
CREATE TABLE LICH_SU_PHONG (
 id INT AUTO_INCREMENT PRIMARY KEY, dat_phong_id INT NOT NULL, phong_id INT NOT NULL,
 tu_ngay DATE NOT NULL, den_ngay DATE NOT NULL, don_gia DECIMAL(12,2) NOT NULL,
 FOREIGN KEY(dat_phong_id) REFERENCES DAT_PHONG(id) ON DELETE CASCADE,
 FOREIGN KEY(phong_id) REFERENCES PHONG(id), CHECK(den_ngay >= tu_ngay)
) ENGINE=InnoDB;
ALTER TABLE THANH_TOAN DROP CHECK THANH_TOAN_chk_1;
ALTER TABLE THANH_TOAN ADD CONSTRAINT chk_tt_nonzero CHECK(so_tien <> 0), ADD nguoi_dung_id INT NULL, ADD ca_lam_viec_id INT NULL, ADD hoan_cho_id INT NULL, ADD CONSTRAINT fk_tt_staff FOREIGN KEY(nguoi_dung_id) REFERENCES NGUOI_DUNG(id), ADD CONSTRAINT fk_tt_refund FOREIGN KEY(hoan_cho_id) REFERENCES THANH_TOAN(id);
