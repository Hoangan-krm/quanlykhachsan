// === API CLIENT (dữ liệu thật từ backend — thay thế localStorage DB cũ) ===
const API_BASE = '/api';
const REQUEST_TIMEOUT_MS = 15000;

function getCustomerToken() {
    return sessionStorage.getItem('HoangAn_TOKEN');
}
function setCustomerToken(token) {
    if (token) sessionStorage.setItem('HoangAn_TOKEN', token);
    else sessionStorage.removeItem('HoangAn_TOKEN');
}
function clearCustomerSession() {
    sessionStorage.removeItem('HoangAn_TOKEN');
    sessionStorage.removeItem('HoangAn_CUSTOMER');
}

// Gọi REST API. Trả về {success, data, message}. Khi lỗi ném Error có
// .code (mã nghiệp vụ) và .statusCode để UI hiển thị đúng thông báo từ server.
async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getCustomerToken();
    if (auth && token) headers['Authorization'] = `Bearer ${token}`;

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: controller ? controller.signal : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            if (res.status === 401) {
                clearCustomerSession();
                currentCustomer = null;
            }
            const err = new Error(data.message || 'Yêu cầu không thành công');
            err.code = data.error;
            err.statusCode = res.status;
            throw err;
        }
        return data;
    } catch (err) {
        if (err.name === 'AbortError') {
            const e = new Error('Yêu cầu vượt quá thời gian chờ. Vui lòng thử lại.');
            e.code = 'TIMEOUT';
            throw e;
        }
        if (err.statusCode) throw err;
        const e = new Error('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
        e.code = 'NETWORK';
        throw e;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

const API = {
    get: (path, opts) => apiRequest(path, Object.assign({}, opts, { method: 'GET' })),
    post: (path, body, opts) => apiRequest(path, Object.assign({}, opts, { method: 'POST', body })),
    put: (path, body, opts) => apiRequest(path, Object.assign({}, opts, { method: 'PUT', body })),
    patch: (path, body, opts) => apiRequest(path, Object.assign({}, opts, { method: 'PATCH', body })),
};

// Đảm bảo số (cột DECIMAL của MySQL trả về dạng chuỗi).
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
