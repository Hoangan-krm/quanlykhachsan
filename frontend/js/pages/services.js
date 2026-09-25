import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { formatCurrency } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { toast, confirmDialog, buildForm, renderTable, renderPagination, openModal, closeModal } from '../components/ui.js';
import { authService } from '../services/auth.js';

export async function renderServices(container, query = {}) {
  setPageTitle('Dịch vụ');
  const canEdit = authService.hasRole('Admin');
  let currentPage = parseInt(query.page || '1', 10);

  async function load() {
    showLoading(container);
    const res = await api.get('/services?page=' + currentPage + '&limit=20');
    clear(container);
    if (canEdit) container.appendChild(el('div', { class: 'toolbar' }, el('button', { class: 'btn btn-primary', onclick: () => showCreateModal() }, '+ Thêm dịch vụ')));
    const tableDiv = el('div');
    const serviceList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    renderTable(tableDiv, {
      columns: [
        { label: 'Tên dịch vụ', key: 'ten_dich_vu' },
        { label: 'Đơn giá', render: r => formatCurrency(r.don_gia) },
        { label: 'Đơn vị', key: 'don_vi_tinh' },
        { label: 'Trạng thái', render: r => el('span', { class: `badge ${r.trang_thai === 'Active' ? 'badge-success' : 'badge-muted'}` }, r.trang_thai === 'Active' ? 'Hoạt động' : 'Ngừng') },
      ],
      rows: serviceList,
      actions: canEdit ? (row) => [
        el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showEditModal(row) }, 'Sửa'),
        el('button', { class: 'btn btn-danger btn-sm', onclick: () => confirmDelete(row) }, 'Xóa'),
      ] : null
    });
    container.appendChild(tableDiv);
    const totalCount = res.total ?? serviceList.length;
    const totalPages = res.totalPages ?? 1;
    const page = res.page ?? 1;
    const limit = res.limit ?? serviceList.length;
    if (totalCount > 0 && totalPages > 1) {
      const pagination = el('div', { class: 'pagination' });
      renderPagination(pagination, { page, totalPages, total: totalCount, limit, onPage: (p) => { currentPage = p; load(); } });
      container.appendChild(pagination);
    }
  }

  function showCreateModal() {
    const { form } = buildForm([
      { name: 'ten_dich_vu', label: 'Tên dịch vụ', required: true },
      { name: 'don_gia', label: 'Đơn giá (VNĐ)', type: 'number', required: true, min: 1, step: 1 },
      { name: 'don_vi_tinh', label: 'Đơn vị tính', required: true, placeholder: 'VD: suất, món, giờ...' },
      { name: 'trang_thai', label: 'Trạng thái', type: 'select', value: 'Active', options: [{ value: 'Active', label: 'Hoạt động' }, { value: 'Inactive', label: 'Ngừng' }] },
    ], async (data) => {
      await api.post('/services', { ...data, don_gia: parseFloat(data.don_gia) });
      toast('Tạo thành công', 'success'); closeModal(); load();
    });
    openModal('Thêm dịch vụ', form);
  }

  function showEditModal(s) {
    const { form } = buildForm([
      { name: 'ten_dich_vu', label: 'Tên dịch vụ', required: true, value: s.ten_dich_vu },
      { name: 'don_gia', label: 'Đơn giá (VNĐ)', type: 'number', required: true, min: 1, step: 1, value: s.don_gia },
      { name: 'don_vi_tinh', label: 'Đơn vị tính', required: true, value: s.don_vi_tinh },
      { name: 'trang_thai', label: 'Trạng thái', type: 'select', value: s.trang_thai, options: [{ value: 'Active', label: 'Hoạt động' }, { value: 'Inactive', label: 'Ngừng' }] },
    ], async (data) => {
      await api.put('/services/' + s.id, { ...data, don_gia: parseFloat(data.don_gia) });
      toast('Cập nhật thành công', 'success'); closeModal(); load();
    });
    openModal('Sửa dịch vụ', form);
  }

  function confirmDelete(s) {
    confirmDialog(`Xóa dịch vụ "${s.ten_dich_vu}"?`, async () => {
      try { await api.delete('/services/' + s.id); toast('Xóa thành công', 'success'); load(); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  await load();
}
