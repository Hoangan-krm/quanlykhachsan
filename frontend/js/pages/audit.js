import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { formatDateTime } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { renderTable, renderPagination } from '../components/ui.js';

export async function renderAudit(container, query = {}) {
  setPageTitle('Nhật ký hoạt động');
  let currentPage = parseInt(query.page || '1', 10);
  let filterUser = '';
  let filterAction = '';
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  let fromDate = monthAgo;
  let toDate = today;

  async function load() {
    showLoading(container);
    const params = new URLSearchParams({ page: currentPage, limit: 30 });
    if (filterUser) params.set('nguoi_dung', filterUser);
    if (filterAction) params.set('action', filterAction);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    const res = await api.get('/audit?' + params.toString());
    clear(container);

    const toolbar = el('div', { class: 'toolbar', style: { flexWrap: 'wrap', gap: '12px' } },
      el('div', { class: 'search-box' },
        el('span', {}, '🔍'),
        el('input', { type: 'text', placeholder: 'Lọc theo người dùng...', value: filterUser, style: { padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', width: '180px' }, oninput: (e) => { filterUser = e.target.value; } }),
        el('button', { class: 'btn btn-primary btn-sm', onclick: () => { currentPage = 1; load(); } }, 'Lọc'),
      ),
      el('div', { class: 'search-box' },
        el('select', { class: 'filter-select', onchange: (e) => { filterAction = e.target.value; currentPage = 1; load(); } },
          el('option', { value: '' }, 'Tất cả hành động'),
          el('option', { value: 'login_success' }, 'Đăng nhập'),
          el('option', { value: 'logout' }, 'Đăng xuất'),
          el('option', { value: 'create' }, 'Tạo'),
          el('option', { value: 'update' }, 'Cập nhật'),
          el('option', { value: 'delete' }, 'Xóa'),
          el('option', { value: 'check_in' }, 'Nhận phòng'),
          el('option', { value: 'check_out' }, 'Trả phòng'),
          el('option', { value: 'payment' }, 'Thanh toán'),
          el('option', { value: 'refund' }, 'Hoàn tiền'),
          el('option', { value: 'lock' }, 'Khóa tài khoản'),
          el('option', { value: 'unlock' }, 'Mở khóa'),
        ),
      ),
      el('div', { class: 'search-box' },
        el('label', { style: { fontSize: '13px', marginRight: '4px' } }, 'Từ:'),
        el('input', { type: 'date', value: fromDate, style: { padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }, onchange: (e) => { fromDate = e.target.value; currentPage = 1; load(); } }),
        el('label', { style: { fontSize: '13px', margin: '0 4px 0 8px' } }, 'Đến:'),
        el('input', { type: 'date', value: toDate, style: { padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }, onchange: (e) => { toDate = e.target.value; currentPage = 1; load(); } }),
      ),
    );
    container.appendChild(toolbar);

    const tableDiv = el('div');
    renderTable(tableDiv, {
      columns: [
        { label: 'Thời gian', render: r => formatDateTime(r.thoi_gian) },
        { label: 'Người dùng', key: 'nguoi_dung' },
        { label: 'Hành động', render: r => el('span', { class: 'badge badge-info' }, r.hanh_dong) },
        { label: 'Chi tiết', key: 'chi_tiet' },
      ],
      rows: res.data || [],
    });
    container.appendChild(tableDiv);
    const pagination = el('div', { class: 'pagination' });
    renderPagination(pagination, { page: res.page, totalPages: res.totalPages, total: res.total, limit: res.limit, onPage: (p) => { currentPage = p; load(); } });
    container.appendChild(pagination);
  }

  await load();
}
