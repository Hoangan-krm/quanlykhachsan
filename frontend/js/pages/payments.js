import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { formatCurrency, formatDateTime, PAYMENT_METHOD } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { toast, renderTable, renderPagination, openModal, closeModal, buildForm } from '../components/ui.js';

// Sổ thanh toán: một truy vấn duy nhất (GET /api/payments) thay vì gọi
// payments theo từng hóa đơn (đã loại bỏ N+1 cũ).
export async function renderPayments(container, query = {}) {
  setPageTitle('Thanh toán');
  let currentPage = parseInt(query.page || '1', 10);
  let currentMethod = query.hinh_thuc || '';

  async function load() {
    showLoading(container);
    const params = new URLSearchParams({ page: currentPage, limit: 20 });
    if (currentMethod) params.set('hinh_thuc', currentMethod);
    const res = await api.get('/payments?' + params.toString());
    clear(container);

    const toolbar = el('div', { class: 'toolbar' },
      (() => {
        const select = el('select', { class: 'form-input', style: { width: '180px' } },
          el('option', { value: '' }, 'Tất cả hình thức'),
          ...Object.entries(PAYMENT_METHOD).map(([value, label]) =>
            el('option', { value, selected: currentMethod === value }, label)));
        select.addEventListener('change', () => { currentMethod = select.value; currentPage = 1; load(); });
        return select;
      })());
    container.appendChild(toolbar);

    const tableDiv = el('div');
    renderTable(tableDiv, {
      columns: [
        { label: 'ID', key: 'id' },
        { label: 'Hóa đơn', render: r => `#${r.hoa_don_id}` },
        { label: 'Khách hàng', render: r => r.ten_khach || '-' },
        { label: 'Phòng', render: r => r.so_phong || '-' },
        { label: 'Số tiền', render: r => formatCurrency(r.so_tien) },
        { label: 'Hình thức', render: r => PAYMENT_METHOD[r.hinh_thuc] || r.hinh_thuc },
        { label: 'Thời gian', render: r => formatDateTime(r.thoi_gian) },
        { label: 'Nhân viên', render: r => r.ten_nhan_vien || (r.ghi_chu?.startsWith('stripe:') ? 'Online' : '-') },
        { label: 'Ghi chú', render: r => r.ghi_chu || '-' },
      ],
      rows: res.data || [],
      actions: (row) => [
        row.so_tien > 0 ? el('button', { class: 'btn btn-danger btn-sm', onclick: () => showRefundModal(row) }, 'Hoàn tiền') : null,
      ],
    });
    container.appendChild(tableDiv);
    const pagination = el('div', { class: 'pagination' });
    renderPagination(pagination, { page: res.page, totalPages: res.totalPages, total: res.total, limit: res.limit, onPage: (p) => { currentPage = p; load(); } });
    container.appendChild(pagination);
  }

  function showRefundModal(payment) {
    const { form } = buildForm([
      { name: 'so_tien', label: 'Số tiền hoàn (VNĐ)', type: 'number', required: true, min: 1, max: payment.so_tien, step: 1, value: payment.so_tien, hint: `Số tiền đã thu: ${formatCurrency(payment.so_tien)}. Hoàn trên ngưỡng cấu hình cần Quản lý phê duyệt.` },
      { name: 'ly_do', label: 'Lý do hoàn tiền', type: 'textarea', required: true },
    ], async (data) => {
      await api.post('/payments/' + payment.id + '/refund', { reason: data.ly_do, so_tien: parseFloat(data.so_tien) });
      toast('Hoàn tiền thành công', 'success'); closeModal(); load();
    });
    openModal('Hoàn tiền thanh toán #' + payment.id, form);
  }

  await load();
}
