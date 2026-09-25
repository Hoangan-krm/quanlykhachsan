import { daysBetween, isOverlap } from '../utils/date.js';

describe('Stay Days Calculation — daysBetween utility', () => {
  test('should calculate 1 night for same-day check-in and next-day check-out', () => {
    expect(daysBetween('2026-09-14', '2026-09-15')).toBe(1);
  });

  test('should calculate 3 nights for a 4-day stay', () => {
    expect(daysBetween('2026-09-14', '2026-09-17')).toBe(3);
  });

  test('should calculate 7 nights for a one-week stay', () => {
    expect(daysBetween('2026-09-14', '2026-09-21')).toBe(7);
  });

  test('should return 0 when check-in equals check-out', () => {
    expect(daysBetween('2026-09-14', '2026-09-14')).toBe(0);
  });

  test('should return negative when check-out is before check-in', () => {
    expect(daysBetween('2026-09-17', '2026-09-14')).toBe(-3);
  });

  test('should handle datetime strings with time component', () => {
    expect(daysBetween('2026-09-14T14:00:00', '2026-09-16T10:00:00')).toBe(2);
  });

  test('should handle month boundaries correctly', () => {
    expect(daysBetween('2026-09-30', '2026-10-02')).toBe(2);
  });

  test('should handle year boundaries correctly', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
  });
});

describe('Stay Days Calculation — Business Logic (BR-StayDays)', () => {
  function calculateStayDays(ngayCheckIn, ngayCheckOut, giaMoiDem, tienCoc = 0, trangThai = 'DaDat', thoiGianCheckInThuc = null) {
    const checkIn = new Date(ngayCheckIn);
    const checkOut = new Date(ngayCheckOut);
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new Error('INVALID_DATE');
    }
    if (checkOut <= checkIn) {
      throw new Error('CHECKOUT_MUST_BE_AFTER_CHECKIN');
    }
    const soDem = daysBetween(ngayCheckIn, ngayCheckOut);
    const soNgayO = soDem + 1;
    const tienPhongUocTinh = soDem * Number(giaMoiDem || 0);

    const now = new Date();
    let soNgayDaO = 0;
    let soNgayConLai = soDem;
    if (trangThai === 'DangO' && thoiGianCheckInThuc) {
      const realCheckIn = new Date(thoiGianCheckInThuc);
      soNgayDaO = Math.max(0, daysBetween(realCheckIn, now));
      soNgayConLai = Math.max(0, soDem - soNgayDaO);
    } else if (trangThai === 'DaTra') {
      soNgayDaO = soDem;
      soNgayConLai = 0;
    }

    return {
      so_dem: soDem,
      so_ngay_o: soNgayO,
      so_ngay_da_o: soNgayDaO,
      so_ngay_con_lai: soNgayConLai,
      gia_moi_dem: Number(giaMoiDem || 0),
      tien_phong_uoc_tinh: tienPhongUocTinh,
      tien_coc: Number(tienCoc || 0),
      con_phai_thu: Math.max(0, tienPhongUocTinh - Number(tienCoc || 0)),
    };
  }

  test('1-night stay: so_dem=1, so_ngay_o=2', () => {
    const r = calculateStayDays('2026-09-14', '2026-09-15', 500000);
    expect(r.so_dem).toBe(1);
    expect(r.so_ngay_o).toBe(2);
  });

  test('3-night stay: so_dem=3, so_ngay_o=4', () => {
    const r = calculateStayDays('2026-09-14', '2026-09-17', 500000);
    expect(r.so_dem).toBe(3);
    expect(r.so_ngay_o).toBe(4);
  });

  test('Room charge = nights × price per night', () => {
    const r = calculateStayDays('2026-09-14', '2026-09-17', 500000);
    expect(r.tien_phong_uoc_tinh).toBe(1500000);
  });

  test('Remaining = room charge - deposit', () => {
    const r = calculateStayDays('2026-09-14', '2026-09-17', 500000, 500000);
    expect(r.con_phai_thu).toBe(1000000);
  });

  test('Remaining should be 0 when deposit covers full charge', () => {
    const r = calculateStayDays('2026-09-14', '2026-09-17', 500000, 1500000);
    expect(r.con_phai_thu).toBe(0);
  });

  test('Remaining should be 0 when deposit exceeds charge (no negative)', () => {
    const r = calculateStayDays('2026-09-14', '2026-09-17', 500000, 2000000);
    expect(r.con_phai_thu).toBe(0);
  });

  test('Should throw when check-out is before check-in', () => {
    expect(() => calculateStayDays('2026-09-17', '2026-09-14', 500000)).toThrow('CHECKOUT_MUST_BE_AFTER_CHECKIN');
  });

  test('Should throw when check-out equals check-in', () => {
    expect(() => calculateStayDays('2026-09-14', '2026-09-14', 500000)).toThrow('CHECKOUT_MUST_BE_AFTER_CHECKIN');
  });

  test('Should throw on invalid date', () => {
    expect(() => calculateStayDays('invalid', '2026-09-17', 500000)).toThrow('INVALID_DATE');
  });

  test('Completed stay (DaTra): so_ngay_da_o = so_dem, so_ngay_con_lai = 0', () => {
    const r = calculateStayDays('2026-09-14', '2026-09-17', 500000, 0, 'DaTra');
    expect(r.so_ngay_da_o).toBe(3);
    expect(r.so_ngay_con_lai).toBe(0);
  });

  test('Future booking (DaDat): so_ngay_da_o = 0, so_ngay_con_lai = so_dem', () => {
    const r = calculateStayDays('2026-12-14', '2026-12-17', 500000, 0, 'DaDat');
    expect(r.so_ngay_da_o).toBe(0);
    expect(r.so_ngay_con_lai).toBe(3);
  });

  test('Zero price per night yields zero room charge', () => {
    const r = calculateStayDays('2026-09-14', '2026-09-17', 0);
    expect(r.tien_phong_uoc_tinh).toBe(0);
    expect(r.con_phai_thu).toBe(0);
  });
});

describe('Stay Days Calculation — Overlap Detection', () => {
  test('Two bookings on same dates overlap', () => {
    expect(isOverlap('2026-09-14', '2026-09-17', '2026-09-15', '2026-09-18')).toBe(true);
  });

  test('Adjacent bookings (checkout = next checkin) do not overlap', () => {
    expect(isOverlap('2026-09-14', '2026-09-17', '2026-09-17', '2026-09-20')).toBe(false);
  });

  test('Non-overlapping bookings do not overlap', () => {
    expect(isOverlap('2026-09-14', '2026-09-16', '2026-09-20', '2026-09-22')).toBe(false);
  });
});
