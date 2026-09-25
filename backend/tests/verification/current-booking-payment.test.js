import { bootEnvironment, resetDatabase, shutdownEnvironment } from '../helpers/env.js';
import * as db from '../helpers/db.js';
import * as auth from '../helpers/auth.js';
import * as api from '../helpers/api.js';

describe('Current audit — booking, billing, cash and reports', () => {
  let token;
  beforeAll(async () => { await bootEnvironment(); }, 120000);
  beforeEach(async () => { await resetDatabase(); token = (await auth.loginAsLeTan()).token; });
  afterAll(async () => { await db.closePool(); await shutdownEnvironment(); });
  async function stay(extra = {}) {
    const r = await api.post('/api/bookings', { khach_hang_id: 1, phong_id: 1, ngay_check_in: '2027-01-01', ngay_check_out: '2027-01-03', ...extra }, token);
    expect(r.status).toBe(201);
    expect((await api.post(`/api/bookings/${r.body.data.id}/check-in`, {}, token)).status).toBe(200);
    return r.body.data.id;
  }
  async function invoice(id) {
    const r = await api.post('/api/invoices', { dat_phong_id: id }, token); expect(r.status).toBe(201); return r.body.data;
  }
  test('terminal bookings reject extension and new services', async () => {
    const r = await api.post('/api/bookings', { khach_hang_id: 1, phong_id: 1, ngay_check_in: '2027-01-01', ngay_check_out: '2027-01-03' }, token);
    const id = r.body.data.id; expect((await api.post(`/api/bookings/${id}/cancel`, {}, token)).status).toBe(200);
    expect((await api.put(`/api/bookings/${id}/extend`, { ngay_check_out: '2027-01-05' }, token)).status).toBe(409);
    expect((await api.post(`/api/bookings/${id}/services`, { dich_vu_id: 1, so_luong: 1 }, token)).status).toBe(409);
  });
  test('transfer rejects maintenance and same room without changing persisted state', async () => {
    const id = await stay(); await db.query("UPDATE PHONG SET trang_thai='BaoTri' WHERE id=2");
    expect((await api.post(`/api/bookings/${id}/transfer-room`, { new_phong_id: 2 }, token)).status).toBe(409);
    expect((await api.post(`/api/bookings/${id}/transfer-room`, { new_phong_id: 1 }, token)).status).toBe(409);
    expect(Number((await db.findRow('DAT_PHONG', { id })).phong_id)).toBe(1);
  });
  test('adding a service to a fully paid invoice reopens its balance and blocks checkout', async () => {
    const id = await stay(); const inv = await invoice(id);
    expect((await api.post(`/api/invoices/${inv.id}/payments`, { so_tien: Number(inv.tong_cong), hinh_thuc: 'TienMat' }, token)).status).toBe(201);
    expect((await api.post(`/api/bookings/${id}/services`, { dich_vu_id: 1, so_luong: 2 }, token)).status).toBe(201);
    expect((await db.findRow('HOA_DON', { id: inv.id })).trang_thai_thanh_toan).toBe('ThanhToanMotPhan');
    expect((await api.post(`/api/bookings/${id}/check-out`, {}, token)).status).toBe(409);
  });
  test('concurrent payments cannot overpay', async () => {
    const inv = await invoice(await stay());
    const results = await Promise.all([1,2].map(() => api.post(`/api/invoices/${inv.id}/payments`, { so_tien: Number(inv.tong_cong), hinh_thuc: 'TienMat' }, token)));
    expect(results.map(x => x.status).sort()).toEqual([201,409]);
    expect(Number(await db.scalar('SELECT SUM(so_tien) FROM THANH_TOAN WHERE hoa_don_id=?', [inv.id]))).toBe(Number(inv.tong_cong));
  });
  test('refund persists a negative transaction and cannot refund same collection twice', async () => {
    const inv = await invoice(await stay());
    const p = await api.post(`/api/invoices/${inv.id}/payments`, { so_tien: Number(inv.tong_cong), hinh_thuc: 'TienMat' }, token);
    const r = await api.post(`/api/payments/${p.body.data.id}/refund`, { reason: 'Khách khiếu nại được duyệt', so_tien: 100000 }, token);
    expect(r.status).toBe(200);
    expect(Number(await db.scalar('SELECT SUM(so_tien) FROM THANH_TOAN WHERE hoa_don_id=?', [inv.id]))).toBe(Number(inv.tong_cong)-100000);
  });
  test('opening cash is included in shift reconciliation', async () => {
    await db.query('DELETE FROM CA_LAM_VIEC');
    const r = await api.post('/api/shifts/open', { tien_mat_dau_ca: 500000 }, token); expect(r.status).toBe(201);
    const close = await api.post(`/api/shifts/${r.body.data.id}/close`, { tien_mat_cuoi_ca: 500000 }, token);
    expect(close.status).toBe(200); expect(close.body.data.chenh_lech).toBe(0); expect(close.body.data.expected_cash).toBe(500000);
  });
  test('revenue includes transactions at the end of the selected day', async () => {
    const inv = await invoice(await stay());
    await db.query("INSERT INTO THANH_TOAN(hoa_don_id,so_tien,hinh_thuc,thoi_gian) VALUES (?,123456,'TienMat','2027-01-15 23:59:59')", [inv.id]);
    const manager = (await auth.loginAsQuanLy()).token;
    const r = await api.get('/api/reports/revenue?from=2027-01-15&to=2027-01-15', manager);
    expect(r.status).toBe(200); expect(Number(r.body.data[0]?.revenue)).toBe(123456);
  });
});
