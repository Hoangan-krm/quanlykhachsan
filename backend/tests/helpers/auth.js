import request from 'supertest';
import { bootEnvironment } from './env.js';

export const credentials = {
  admin: { email: 'admin@hoangan.vn', password: 'admin123' },
  quanly: { email: 'manager@hoangan.vn', password: 'manager123' },
  letan: { email: 'letan01@hoangan.vn', password: 'letan123' },
};

export async function loginAs(email, password) {
  const { app } = await bootEnvironment();
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { status: res.status, body: res.body, token: res.body?.data?.token, user: res.body?.data?.user };
}

export async function loginAsAdmin() {
  const r = await loginAs(credentials.admin.email, credentials.admin.password);
  if (r.status !== 200) throw new Error(`Admin login failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r;
}

export async function loginAsQuanLy() {
  const r = await loginAs(credentials.quanly.email, credentials.quanly.password);
  if (r.status !== 200) throw new Error(`QuanLy login failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r;
}

export async function loginAsLeTan() {
  const r = await loginAs(credentials.letan.email, credentials.letan.password);
  if (r.status !== 200) throw new Error(`LeTan login failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r;
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// US-35: tài khoản web phải xác thực email trước khi kích hoạt. Helper đi đúng
// luồng nghiệp vụ: register → lấy link xác thực (dev, SMTP tắt) → verify → login.
export async function registerVerifiedCustomer(payload) {
  const { app } = await bootEnvironment();
  const reg = await request(app).post('/api/customers/register').send(payload);
  if (reg.status !== 201) throw new Error(`Register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
  const verifyUrl = reg.body?.data?.verification_url_dev;
  if (verifyUrl) {
    const token = new URL(verifyUrl.replace('/#/', '/')).searchParams.get('token');
    const verify = await request(app).post('/api/customers/verify-account').send({ token });
    if (verify.status !== 200) throw new Error(`Verify failed: ${verify.status} ${JSON.stringify(verify.body)}`);
  }
  const login = await request(app).post('/api/customers/login').send({ email: payload.email, password: payload.password });
  if (login.status !== 200) throw new Error(`Customer login failed: ${login.status} ${JSON.stringify(login.body)}`);
  return { status: login.status, token: login.body?.data?.token, customer: login.body?.data?.customer, body: login.body };
}
