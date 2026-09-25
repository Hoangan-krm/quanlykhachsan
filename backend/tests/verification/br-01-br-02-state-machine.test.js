import {
  canTransitionRoom,
  canTransitionBooking,
  assertRoomTransition,
  assertBookingTransition,
  ROOM_TRANSITIONS,
  BOOKING_TRANSITIONS,
} from '../../services/stateMachine.js';
import { AppError } from '../../utils/errors.js';

describe('BR-01 & BR-02 — Centralized State Machine', () => {
  describe('BR-01: Room status transitions', () => {
    test('Trong → DaDat is valid', () => {
      expect(canTransitionRoom('Trong', 'DaDat')).toBe(true);
    });

    test('Trong → DangO is valid (direct check-in)', () => {
      expect(canTransitionRoom('Trong', 'DangO')).toBe(true);
    });

    test('Trong → BaoTri is valid', () => {
      expect(canTransitionRoom('Trong', 'BaoTri')).toBe(true);
    });

    test('DaDat → DangO is valid', () => {
      expect(canTransitionRoom('DaDat', 'DangO')).toBe(true);
    });

    test('DaDat → Trong is valid (cancel)', () => {
      expect(canTransitionRoom('DaDat', 'Trong')).toBe(true);
    });

    test('DangO → DangDon is valid', () => {
      expect(canTransitionRoom('DangO', 'DangDon')).toBe(true);
    });

    test('DangDon → Trong is valid (cleaned)', () => {
      expect(canTransitionRoom('DangDon', 'Trong')).toBe(true);
    });

    test('BaoTri → Trong is valid', () => {
      expect(canTransitionRoom('BaoTri', 'Trong')).toBe(true);
    });

    test('Trong → DangDon is invalid (skip)', () => {
      expect(canTransitionRoom('Trong', 'DangDon')).toBe(false);
    });

    test('BaoTri → DangO is invalid', () => {
      expect(canTransitionRoom('BaoTri', 'DangO')).toBe(false);
    });

    test('BaoTri → DaDat is invalid', () => {
      expect(canTransitionRoom('BaoTri', 'DaDat')).toBe(false);
    });

    test('DangDon → DangO is invalid', () => {
      expect(canTransitionRoom('DangDon', 'DangO')).toBe(false);
    });

    test('DangDon → BaoTri is invalid', () => {
      expect(canTransitionRoom('DangDon', 'BaoTri')).toBe(false);
    });

    test('assertRoomTransition throws on invalid transition', () => {
      expect(() => assertRoomTransition('BaoTri', 'DangO')).toThrow(AppError);
    });

    test('assertRoomTransition does not throw on valid transition', () => {
      expect(() => assertRoomTransition('Trong', 'DaDat')).not.toThrow();
    });

    test('ROOM_TRANSITIONS has all 5 statuses', () => {
      expect(Object.keys(ROOM_TRANSITIONS).sort()).toEqual(
        ['BaoTri', 'DaDat', 'DangDon', 'DangO', 'Trong']
      );
    });
  });

  describe('BR-02: Booking status transitions', () => {
    test('ChoXacNhan → DaDat is valid', () => {
      expect(canTransitionBooking('ChoXacNhan', 'DaDat')).toBe(true);
    });

    test('ChoXacNhan → Huy is valid', () => {
      expect(canTransitionBooking('ChoXacNhan', 'Huy')).toBe(true);
    });

    test('ChoXacNhan → NoShow is valid', () => {
      expect(canTransitionBooking('ChoXacNhan', 'NoShow')).toBe(true);
    });

    test('DaDat → DangO is valid', () => {
      expect(canTransitionBooking('DaDat', 'DangO')).toBe(true);
    });

    test('DaDat → Huy is valid', () => {
      expect(canTransitionBooking('DaDat', 'Huy')).toBe(true);
    });

    test('DaDat → NoShow is valid', () => {
      expect(canTransitionBooking('DaDat', 'NoShow')).toBe(true);
    });

    test('DangO → DaTra is valid', () => {
      expect(canTransitionBooking('DangO', 'DaTra')).toBe(true);
    });

    test('DaTra → DangO is invalid (terminal)', () => {
      expect(canTransitionBooking('DaTra', 'DangO')).toBe(false);
    });

    test('DaTra → Huy is invalid (terminal)', () => {
      expect(canTransitionBooking('DaTra', 'Huy')).toBe(false);
    });

    test('Huy → DaDat is invalid (terminal)', () => {
      expect(canTransitionBooking('Huy', 'DaDat')).toBe(false);
    });

    test('Huy → DangO is invalid (terminal)', () => {
      expect(canTransitionBooking('Huy', 'DangO')).toBe(false);
    });

    test('NoShow → DaDat is invalid (terminal)', () => {
      expect(canTransitionBooking('NoShow', 'DaDat')).toBe(false);
    });

    test('NoShow → DangO is invalid (terminal)', () => {
      expect(canTransitionBooking('NoShow', 'DangO')).toBe(false);
    });

    test('ChoXacNhan → DangO is invalid (must confirm first)', () => {
      expect(canTransitionBooking('ChoXacNhan', 'DangO')).toBe(false);
    });

    test('DangO → Huy is invalid (cannot cancel while staying)', () => {
      expect(canTransitionBooking('DangO', 'Huy')).toBe(false);
    });

    test('assertBookingTransition throws on invalid transition', () => {
      expect(() => assertBookingTransition('DaTra', 'DangO')).toThrow(AppError);
    });

    test('assertBookingTransition does not throw on valid transition', () => {
      expect(() => assertBookingTransition('DaDat', 'DangO')).not.toThrow();
    });

    test('BOOKING_TRANSITIONS has all 6 statuses', () => {
      expect(Object.keys(BOOKING_TRANSITIONS).sort()).toEqual(
        ['ChoXacNhan', 'DaDat', 'DaTra', 'DangO', 'Huy', 'NoShow']
      );
    });

    test('DaTra is terminal (empty transitions)', () => {
      expect(BOOKING_TRANSITIONS['DaTra']).toEqual([]);
    });

    test('Huy is terminal (empty transitions)', () => {
      expect(BOOKING_TRANSITIONS['Huy']).toEqual([]);
    });

    test('NoShow is terminal (empty transitions)', () => {
      expect(BOOKING_TRANSITIONS['NoShow']).toEqual([]);
    });
  });
});
