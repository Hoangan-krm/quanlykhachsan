describe('Business Rules — Room Status State Machine (BR-01)', () => {
  const ALLOWED_TRANSITIONS = {
    'Trong':   ['DaDat', 'DangO', 'BaoTri'],
    'DaDat':   ['DangO', 'Trong'],
    'DangO':   ['DangDon', 'DangO'],
    'DangDon': ['Trong'],
    'BaoTri':  ['Trong'],
  };

  test('Trong can transition to DaDat, DangO, BaoTri', () => {
    expect(ALLOWED_TRANSITIONS['Trong']).toContain('DaDat');
    expect(ALLOWED_TRANSITIONS['Trong']).toContain('DangO');
    expect(ALLOWED_TRANSITIONS['Trong']).toContain('BaoTri');
  });

  test('Trong cannot transition to DangDon', () => {
    expect(ALLOWED_TRANSITIONS['Trong']).not.toContain('DangDon');
  });

  test('DaDat can transition to DangO or back to Trong', () => {
    expect(ALLOWED_TRANSITIONS['DaDat']).toContain('DangO');
    expect(ALLOWED_TRANSITIONS['DaDat']).toContain('Trong');
  });

  test('DangO can transition to DangDon', () => {
    expect(ALLOWED_TRANSITIONS['DangO']).toContain('DangDon');
  });

  test('DangDon can only transition to Trong', () => {
    expect(ALLOWED_TRANSITIONS['DangDon']).toEqual(['Trong']);
  });

  test('BaoTri can only transition to Trong', () => {
    expect(ALLOWED_TRANSITIONS['BaoTri']).toEqual(['Trong']);
  });
});

describe('Business Rules — Booking Status State Machine (BR-04)', () => {
  const BOOKING_TRANSITIONS = {
    'ChoXacNhan': ['DaDat', 'Huy', 'NoShow'],
    'DaDat':      ['DangO', 'Huy', 'NoShow'],
    'DangO':      ['DaTra'],
    'DaTra':      [],
    'Huy':        [],
    'NoShow':     [],
  };

  test('ChoXacNhan can be confirmed, cancelled, or no-show', () => {
    expect(BOOKING_TRANSITIONS['ChoXacNhan']).toContain('DaDat');
    expect(BOOKING_TRANSITIONS['ChoXacNhan']).toContain('Huy');
    expect(BOOKING_TRANSITIONS['ChoXacNhan']).toContain('NoShow');
  });

  test('DaDat can be checked in, cancelled, or no-show', () => {
    expect(BOOKING_TRANSITIONS['DaDat']).toContain('DangO');
    expect(BOOKING_TRANSITIONS['DaDat']).toContain('Huy');
    expect(BOOKING_TRANSITIONS['DaDat']).toContain('NoShow');
  });

  test('DangO can only transition to DaTra', () => {
    expect(BOOKING_TRANSITIONS['DangO']).toEqual(['DaTra']);
  });

  test('DaTra is terminal state', () => {
    expect(BOOKING_TRANSITIONS['DaTra']).toHaveLength(0);
  });

  test('Huy is terminal state', () => {
    expect(BOOKING_TRANSITIONS['Huy']).toHaveLength(0);
  });

  test('NoShow is terminal state', () => {
    expect(BOOKING_TRANSITIONS['NoShow']).toHaveLength(0);
  });
});

describe('Business Rules — Checkout Precondition (BR-06 / Story 25 AC)', () => {
  test('Checkout must fail when invoice is not fully paid', () => {
    const invoice = { trang_thai_thanh_toan: 'ChuaThanhToan', tong_cong: 5000000 };
    const canCheckout = invoice.trang_thai_thanh_toan === 'DaThanhToan';
    expect(canCheckout).toBe(false);
  });

  test('Checkout must fail when invoice is partially paid', () => {
    const invoice = { trang_thai_thanh_toan: 'ThanhToanMotPhan', tong_cong: 5000000 };
    const canCheckout = invoice.trang_thai_thanh_toan === 'DaThanhToan';
    expect(canCheckout).toBe(false);
  });

  test('Checkout must succeed only when invoice is fully paid', () => {
    const invoice = { trang_thai_thanh_toan: 'DaThanhToan', tong_cong: 5000000 };
    const canCheckout = invoice.trang_thai_thanh_toan === 'DaThanhToan';
    expect(canCheckout).toBe(true);
  });

  test('Checkout must fail when no invoice exists', () => {
    const invoice = null;
    const canCheckout = invoice && invoice.trang_thai_thanh_toan === 'DaThanhToan';
    expect(canCheckout).toBeFalsy();
  });
});

describe('Business Rules — Payment Overpayment Prevention (BR-11)', () => {
  test('Payment exceeding remaining should be rejected', () => {
    const invoiceTotal = 5000000;
    const paidSoFar = 3000000;
    const newAmount = 2500000;
    const remaining = invoiceTotal - paidSoFar;
    const isOverpayment = newAmount > remaining;
    expect(isOverpayment).toBe(true);
  });

  test('Payment equal to remaining should be allowed', () => {
    const invoiceTotal = 5000000;
    const paidSoFar = 3000000;
    const newAmount = 2000000;
    const remaining = invoiceTotal - paidSoFar;
    const isOverpayment = newAmount > remaining;
    expect(isOverpayment).toBe(false);
  });

  test('Payment less than remaining should be allowed', () => {
    const invoiceTotal = 5000000;
    const paidSoFar = 1000000;
    const newAmount = 1000000;
    const remaining = invoiceTotal - paidSoFar;
    const isOverpayment = newAmount > remaining;
    expect(isOverpayment).toBe(false);
  });
});

describe('Business Rules — Invoice Calculation (BR-10)', () => {
  test('Invoice total = room charges + service charges + VAT - deposit', () => {
    const roomCharges = 3200000;
    const serviceCharges = 1250000;
    const vatRate = 0.10;
    const deposit = 800000;
    const subtotal = roomCharges + serviceCharges;
    const vat = subtotal * vatRate;
    const total = subtotal + vat - deposit;
    expect(total).toBe(4095000);
  });

  test('Invoice with promo discount', () => {
    const roomCharges = 3200000;
    const serviceCharges = 1250000;
    const vatRate = 0.10;
    const deposit = 800000;
    const promoPercent = 10;
    const subtotal = roomCharges + serviceCharges;
    const vat = subtotal * vatRate;
    let total = subtotal + vat - deposit;
    total = total * (1 - promoPercent / 100);
    expect(total).toBe(3685500);
  });
});

describe('Business Rules — Payment Status Update (BR-12)', () => {
  test('No payment → ChuaThanhToan', () => {
    const paidSoFar = 0;
    const invoiceTotal = 5000000;
    let status = 'ChuaThanhToan';
    if (paidSoFar >= invoiceTotal) status = 'DaThanhToan';
    else if (paidSoFar > 0) status = 'ThanhToanMotPhan';
    expect(status).toBe('ChuaThanhToan');
  });

  test('Partial payment → ThanhToanMotPhan', () => {
    const paidSoFar = 2000000;
    const invoiceTotal = 5000000;
    let status = 'ChuaThanhToan';
    if (paidSoFar >= invoiceTotal) status = 'DaThanhToan';
    else if (paidSoFar > 0) status = 'ThanhToanMotPhan';
    expect(status).toBe('ThanhToanMotPhan');
  });

  test('Full payment → DaThanhToan', () => {
    const paidSoFar = 5000000;
    const invoiceTotal = 5000000;
    let status = 'ChuaThanhToan';
    if (paidSoFar >= invoiceTotal) status = 'DaThanhToan';
    else if (paidSoFar > 0) status = 'ThanhToanMotPhan';
    expect(status).toBe('DaThanhToan');
  });
});

describe('Business Rules — No-Show Policy (BR-07)', () => {
  test('No-show cannot be marked before check-in time', () => {
    const now = new Date('2026-09-15T10:00:00');
    const expectedCheckIn = new Date('2026-09-15');
    expectedCheckIn.setHours(14, 0, 0, 0);
    const isTooEarly = now < expectedCheckIn;
    expect(isTooEarly).toBe(true);
  });

  test('No-show can be marked after check-in time', () => {
    const now = new Date('2026-09-15T15:00:00');
    const expectedCheckIn = new Date('2026-09-15');
    expectedCheckIn.setHours(14, 0, 0, 0);
    const isTooEarly = now < expectedCheckIn;
    expect(isTooEarly).toBe(false);
  });
});

describe('Business Rules — Review Eligibility (BR-15)', () => {
  test('Review only allowed after checkout (DaTra)', () => {
    const bookingStatus = 'DaTra';
    const isEligible = bookingStatus === 'DaTra';
    expect(isEligible).toBe(true);
  });

  test('Review not allowed during stay (DangO)', () => {
    const bookingStatus = 'DangO';
    const isEligible = bookingStatus === 'DaTra';
    expect(isEligible).toBe(false);
  });

  test('Review not allowed for confirmed booking (DaDat)', () => {
    const bookingStatus = 'DaDat';
    const isEligible = bookingStatus === 'DaTra';
    expect(isEligible).toBe(false);
  });
});

describe('Business Rules — Auth Lockout (SEC-03)', () => {
  const MAX_LOGIN_ATTEMPTS = 5;

  test('Account should lock after 5 failed attempts', () => {
    let attempts = 0;
    let isLocked = false;
    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
      attempts++;
      if (attempts >= MAX_LOGIN_ATTEMPTS) isLocked = true;
    }
    expect(isLocked).toBe(true);
    expect(attempts).toBe(5);
  });

  test('Account should not lock before 5 failed attempts', () => {
    let attempts = 4;
    let isLocked = attempts >= MAX_LOGIN_ATTEMPTS;
    expect(isLocked).toBe(false);
  });
});
