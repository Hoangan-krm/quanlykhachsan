import { api, downloadBlob } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { setPageTitle } from '../components/layout.js';
import { toast, confirmDialog, buildForm, renderTable, renderPagination, openModal, closeModal } from '../components/ui.js';

export async function renderCustomers(container, query = {}) {
  setPageTitle('Khách hàng');
  let currentPage = parseInt(query.page || '1', 10);
  let search = '';

  async function load() {
    showLoading(container);
    const params = new URLSearchParams({ page: currentPage, limit: 20 });
    if (search) params.set('search', search);
    const res = await api.get('/customers?' + params.toString());
    clear(container);
    const toolbar = el('div', { class: 'toolbar' },
      el('div', { class: 'search-box' }, el('span', {}, '🔍'),
        el('input', { type: 'text', placeholder: 'Tìm theo tên/SĐT/email...', value: search, oninput: (e) => { search = e.target.value; } }),
        el('button', { class: 'btn btn-primary btn-sm', onclick: () => { currentPage = 1; load(); } }, 'Tìm')
      ),
      el('div', { style: { display: 'flex', gap: '8px' } },
        el('button', { class: 'btn btn-secondary', onclick: () => showExportModal() }, '📥 Xuất tạm trú'),
        el('button', { class: 'btn btn-primary', onclick: () => showCreateModal() }, '+ Thêm khách'),
      )
    );
    container.appendChild(toolbar);
    const tableDiv = el('div');
    renderTable(tableDiv, {
      columns: [
        { label: 'Họ tên', key: 'ho_ten' },
        { label: 'SĐT', key: 'sdt' },
        { label: 'Email', render: r => r.email || '-' },
        { label: 'CCCD/Passport', key: 'cccd_passport' },
        { label: 'Quốc tịch', render: r => r.quoc_tich || '-' },
      ],
      rows: res.data || [],
      actions: (row) => [
        el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showEditModal(row) }, 'Sửa'),
        el('button', { class: 'btn btn-danger btn-sm', onclick: () => confirmDelete(row) }, 'Xóa'),
      ]
    });
    container.appendChild(tableDiv);
    const pagination = el('div', { class: 'pagination' });
    renderPagination(pagination, { page: res.page, totalPages: res.totalPages, total: res.total, limit: res.limit, onPage: (p) => { currentPage = p; load(); } });
    container.appendChild(pagination);
  }

  function showExportModal() {
    const today = new Date().toISOString().slice(0, 10);
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { form } = buildForm([
      { name: 'from', label: 'Từ ngày', type: 'date', required: true, value: monthAgo },
      { name: 'to', label: 'Đến ngày', type: 'date', required: true, value: today },
    ], async (data) => {
      closeModal();
      try {
        const blob = await api.download(`/customers/export/temp-residence?from=${data.from}&to=${data.to}&format=excel`);
        downloadBlob(blob, `khai-bao-tam-tru-${data.from}-to-${data.to}.xlsx`);
        toast('Xuất danh sách tạm trú thành công', 'success');
      } catch (err) {
        toast(err.message, 'error');
      }
    }, 'Xuất Excel');
    openModal('Xuất danh sách khai báo tạm trú', form);
  }

  function showCreateModal() {
    const { form } = buildForm([
      { name: 'ho_ten', label: 'Họ tên', required: true },
      { name: 'sdt', label: 'Số điện thoại', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'cccd_passport', label: 'CCCD/Passport', required: true },
      { name: 'quoc_tich', label: 'Quốc tịch', value: 'Việt Nam' },
      { name: 'dia_chi', label: 'Địa chỉ', type: 'textarea' },
      { name: 'ghi_chu', label: 'Ghi chú', type: 'textarea' },
    ], async (data) => {
      await api.post('/customers', data);
      toast('Tạo thành công', 'success'); closeModal(); load();
    });
    openModal('Thêm khách hàng', form);
  }

  function showEditModal(c) {
    const { form } = buildForm([
      { name: 'ho_ten', label: 'Họ tên', required: true, value: c.ho_ten },
      { name: 'sdt', label: 'Số điện thoại', required: true, value: c.sdt },
      { name: 'email', label: 'Email', type: 'email', value: c.email || '' },
      { name: 'cccd_passport', label: 'CCCD/Passport', required: true, value: c.cccd_passport },
      { name: 'quoc_tich', label: 'Quốc tịch', value: c.quoc_tich || 'Việt Nam' },
      { name: 'dia_chi', label: 'Địa chỉ', type: 'textarea', value: c.dia_chi || '' },
      { name: 'ghi_chu', label: 'Ghi chú', type: 'textarea', value: c.ghi_chu || '' },
    ], async (data) => {
      await api.put('/customers/' + c.id, data);
      toast('Cập nhật thành công', 'success'); closeModal(); load();
    });
    openModal('Sửa khách hàng', form);
  }

  function confirmDelete(c) {
    confirmDialog(`Xóa khách hàng "${c.ho_ten}"?`, async () => {
      try { await api.delete('/customers/' + c.id); toast('Xóa thành công', 'success'); load(); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  await load();
}
