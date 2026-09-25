import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('FR-29 — Shift Guards', () => {
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });

  describe('FR-29: Open shift when unclosed exists → 409 SHIFT_ALREADY_OPEN', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('cannot open second shift while one is open', async () => {
      const { token } = await auth.loginAsLeTan();
      const openShift = await db.scalar(
        `SELECT clv.id FROM CA_LAM_VIEC clv JOIN NGUOI_DUNG nd ON clv.nguoi_dung_id = nd.id WHERE nd.vai_tro = 'LeTan' AND clv.gio_dong_ca IS NULL LIMIT 1`
      );

      if (!openShift) {
        const openRes = await api.post('/api/shifts/open', { tien_mat_dau_ca: 1000000 }, token);
        expect([200, 201]).toContain(openRes.status);
      }

      const r = await api.post('/api/shifts/open', { tien_mat_dau_ca: 500000 }, token);
      expect(r.status).toBe(409);
      expect(r.body.error).toBe('SHIFT_ALREADY_OPEN');
    });
  });

  describe('FR-29: Close already-closed shift → 409 SHIFT_ALREADY_CLOSED', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('cannot close a shift that is already closed', async () => {
      const { token } = await auth.loginAsLeTan();
      const openShiftId = await db.scalar(
        `SELECT clv.id FROM CA_LAM_VIEC clv JOIN NGUOI_DUNG nd ON clv.nguoi_dung_id = nd.id WHERE nd.vai_tro = 'LeTan' AND clv.gio_dong_ca IS NULL LIMIT 1`
      );

      let shiftId = openShiftId;
      if (!shiftId) {
        const openRes = await api.post('/api/shifts/open', { tien_mat_dau_ca: 1000000 }, token);
        shiftId = openRes.body?.data?.id;
      }

      const closeRes = await api.post(`/api/shifts/${shiftId}/close`, { tien_mat_cuoi_ca: 1000000 }, token);
      expect(closeRes.status).toBe(200);

      const r = await api.post(`/api/shifts/${shiftId}/close`, { tien_mat_cuoi_ca: 1000000 }, token);
      expect(r.status).toBe(409);
      expect(r.body.error).toBe('SHIFT_ALREADY_CLOSED');
    });
  });

  describe('FR-29: Normal open → 201', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('open shift succeeds when no unclosed shift exists', async () => {
      const { token } = await auth.loginAsLeTan();
      const openShiftId = await db.scalar(
        `SELECT clv.id FROM CA_LAM_VIEC clv JOIN NGUOI_DUNG nd ON clv.nguoi_dung_id = nd.id WHERE nd.vai_tro = 'LeTan' AND clv.gio_dong_ca IS NULL LIMIT 1`
      );

      if (openShiftId) {
        await api.post(`/api/shifts/${openShiftId}/close`, { tien_mat_cuoi_ca: 1000000 }, token);
      }

      const r = await api.post('/api/shifts/open', { tien_mat_dau_ca: 2000000 }, token);
      expect([200, 201]).toContain(r.status);
    });
  });

  describe('FR-29: Normal close → 200', () => {
    beforeAll(async () => { await resetDatabase(); });

    test('close shift succeeds when shift is open', async () => {
      const { token } = await auth.loginAsLeTan();
      let openShiftId = await db.scalar(
        `SELECT clv.id FROM CA_LAM_VIEC clv JOIN NGUOI_DUNG nd ON clv.nguoi_dung_id = nd.id WHERE nd.vai_tro = 'LeTan' AND clv.gio_dong_ca IS NULL LIMIT 1`
      );

      if (!openShiftId) {
        const openRes = await api.post('/api/shifts/open', { tien_mat_dau_ca: 1000000 }, token);
        openShiftId = openRes.body?.data?.id;
      }

      const r = await api.post(`/api/shifts/${openShiftId}/close`, { tien_mat_cuoi_ca: 1000000 }, token);
      expect(r.status).toBe(200);
    });
  });
});
