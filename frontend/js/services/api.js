const API_BASE = '/api';
const REQUEST_TIMEOUT_MS = 15000;

export function getToken() { return localStorage.getItem('token'); }
export function setToken(t) { localStorage.setItem('token', t); }
export function clearToken() { localStorage.removeItem('token'); }

function buildTimeoutSignal(timeoutMs) {
  if (typeof AbortController === 'function') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return { signal: controller.signal, clear: () => clearTimeout(timer) };
  }
  return { signal: undefined, clear: () => {} };
}

function handleUnauthorized(status) {
  if (status === 401) {
    let role = null;
    try { role = JSON.parse(localStorage.getItem('user') || 'null')?.vai_tro; } catch {}
    clearToken();
    localStorage.removeItem('user');
    if (typeof window !== 'undefined' && window.location) {
      const target = role === 'Customer' ? '#/customer-login' : '#/login';
      if (window.location.hash !== target) window.location.hash = target;
    }
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const { signal, clear: clearTimeoutTimer } = buildTimeoutSignal(REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal });
    clearTimeoutTimer();
    const data = await res.json();
    if (!res.ok) {
      handleUnauthorized(res.status);
      const err = new Error(data.message || 'Request failed');
      err.code = data.error;
      err.details = data.details;
      err.statusCode = res.status;
      throw err;
    }
    return data;
  } catch (err) {
    clearTimeoutTimer();
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Yêu cầu vượt quá thời gian chờ');
      timeoutErr.code = 'TIMEOUT';
      timeoutErr.statusCode = null;
      throw timeoutErr;
    }
    if (err.statusCode) throw err;
    err.message = 'Không thể kết nối đến server';
    throw err;
  }
}

export const api = {
  get: (p, opts) => request(p, { ...opts, method: 'GET' }),
  post: (p, body, opts) => request(p, { ...opts, method: 'POST', body: JSON.stringify(body) }),
  put: (p, body, opts) => request(p, { ...opts, method: 'PUT', body: JSON.stringify(body) }),
  patch: (p, body, opts) => request(p, { ...opts, method: 'PATCH', body: JSON.stringify(body) }),
  delete: (p, opts) => request(p, { ...opts, method: 'DELETE' }),
  download: async (p) => {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${p}`, { headers });
    if (!res.ok) {
      handleUnauthorized(res.status);
      const data = await res.json().catch(() => ({}));
      const err = new Error(data.message || 'Download failed');
      err.code = data.error;
      err.statusCode = res.status;
      throw err;
    }
    const blob = await res.blob();
    return blob;
  },
};

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
