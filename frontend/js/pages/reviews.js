import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { formatDate } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { toast, renderTable, renderPagination } from '../components/ui.js';

export async function renderReviews(container, query = {}) {
  setPageTitle('Đánh giá');
  let currentPage = parseInt(query.page || '1', 10);

  async function load() {
    showLoading(container);
    const res = await api.get('/reviews?page=' + currentPage + '&limit=20');
    clear(container);
    const tableDiv = el('div');
    renderTable(tableDiv, {
      columns: [
        { label: 'ID', key: 'id' },
        { label: 'Khách hàng', render: r => r.ten_khach || '-' },
        { label: 'Booking', render: r => `#${r.dat_phong_id}` },
        { label: 'Số sao', render: r => '⭐'.repeat(r.so_sao) },
        { label: 'Nội dung', render: r => r.noi_dung || '-' },
        { label: 'Ngày', render: r => formatDate(r.created_at) },
        { label: 'Trạng thái', render: r => el('span', { class: `badge ${r.trang_thai_duyet === 'DaDuyet' ? 'badge-success' : r.trang_thai_duyet === 'TuChoi' ? 'badge-danger' : 'badge-warning'}` }, r.trang_thai_duyet === 'DaDuyet' ? 'Đã duyệt' : r.trang_thai_duyet === 'TuChoi' ? 'Từ chối' : 'Chờ duyệt') },
      ],
      rows: res.data || [],
      actions: (row) => [
        row.trang_thai_duyet === 'ChoDuyet' ? el('button', { class: 'btn btn-success btn-sm', onclick: () => moderate(row, 'DaDuyet') }, 'Duyệt') : null,
        row.trang_thai_duyet === 'ChoDuyet' ? el('button', { class: 'btn btn-danger btn-sm', onclick: () => moderate(row, 'TuChoi') }, 'Từ chối') : null,
      ]
    });
    container.appendChild(tableDiv);
    const pagination = el('div', { class: 'pagination' });
    renderPagination(pagination, { page: res.page, totalPages: res.totalPages, total: res.total, limit: res.limit, onPage: (p) => { currentPage = p; load(); } });
    container.appendChild(pagination);
  }

  async function moderate(row, status) {
    try { await api.post('/reviews/' + row.id + '/moderate', { trang_thai_duyet: status }); toast('Thành công', 'success'); load(); }
    catch (err) { toast(err.message, 'error'); }
  }

  await load();
}
