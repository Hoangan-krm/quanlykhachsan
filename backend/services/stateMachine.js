import { createError } from '../utils/errors.js';

const ROOM_TRANSITIONS = {
  'Trong':   ['DaDat', 'DangO', 'BaoTri'],
  'DaDat':   ['DangO', 'Trong'],
  'DangO':   ['DangDon', 'DangO'],
  'DangDon': ['Trong'],
  'BaoTri':  ['Trong'],
};

const BOOKING_TRANSITIONS = {
  'ChoXacNhan': ['DaDat', 'Huy', 'NoShow'],
  'DaDat':      ['DangO', 'Huy', 'NoShow'],
  'DangO':      ['DaTra'],
  'DaTra':      [],
  'Huy':        [],
  'NoShow':     [],
};

export function canTransitionRoom(from, to) {
  const allowed = ROOM_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function canTransitionBooking(from, to) {
  const allowed = BOOKING_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export function assertRoomTransition(from, to) {
  if (!canTransitionRoom(from, to)) {
    throw createError('INVALID_STATUS_TRANSITION', {
      details: { current: from, requested: to, allowed: ROOM_TRANSITIONS[from] || [] }
    });
  }
}

export function assertBookingTransition(from, to) {
  if (!canTransitionBooking(from, to)) {
    throw createError('INVALID_STATUS_TRANSITION', {
      details: { current: from, requested: to, allowed: BOOKING_TRANSITIONS[from] || [] }
    });
  }
}

export { ROOM_TRANSITIONS, BOOKING_TRANSITIONS };
