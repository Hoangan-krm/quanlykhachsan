import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { formatCurrency } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { toast, confirmDialog, buildForm, renderTable, renderPagination, openModal, closeModal } from '../components/ui.js';
import { authService } from '../services/auth.js';

export async function renderRoomTypes(container, query = {}) {
  setPageTitle('Loại phòng');
  const canEdit = authService.hasRole('Admin');
  let currentPage = parseInt(query.page || '1', 10);

  async function load() {
    showLoading(container);
    const res = await api.get('/room-types');
    clear(container);
    if (canEdit) container.appendChild(el('div', { class: 'toolbar' }, el('button', { class: 'btn btn-primary', onclick: () => showCreateModal() }, '+ Thêm loại phòng')));
    const tableDiv = el('div');
    renderTable(tableDiv, {
      columns: [
        { label: 'Tên loại', key: 'ten_loai_phong' },
        { label: 'Mô tả', render: r => r.mo_ta || '-' },
        { label: 'Giá mặc định', render: r => formatCurrency(r.gia_mac_dinh) },
      ],
      rows: res.data || [],
      actions: canEdit ? (row) => [
        el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showEditModal(row) }, 'Sửa'),
        el('button', { class: 'btn btn-danger btn-sm', onclick: () => confirmDelete(row) }, 'Xóa'),
      ] : null
    });
    container.appendChild(tableDiv);
  }

  function showCreateModal() {
    const { form } = buildForm([
      { name: 'ten_loai_phong', label: 'Tên loại phòng', required: true },
      { name: 'mo_ta', label: 'Mô tả', type: 'textarea' },
      { name: 'gia_mac_dinh', label: 'Giá mặc định (VNĐ)', type: 'number', required: true, min: 1, step: 1 },
    ], async (data) => {
      await api.post('/room-types', { ...data, gia_mac_dinh: parseFloat(data.gia_mac_dinh) });
      toast('Tạo thành công', 'success'); closeModal(); load();
    });
    openModal('Thêm loại phòng', form);
  }

  function showEditModal(rt) {
    const { form } = buildForm([
      { name: 'ten_loai_phong', label: 'Tên loại phòng', required: true, value: rt.ten_loai_phong },
      { name: 'mo_ta', label: 'Mô tả', type: 'textarea', value: rt.mo_ta || '' },
      { name: 'gia_mac_dinh', label: 'Giá mặc định (VNđ)', type: 'number', required: true, min: 1, step: 1, value: rt.gia_mac_dinh },
    ], async (data) => {
      await api.put('/room-types/' + rt.id, { ...data, gia_mac_dinh: parseFloat(data.gia_mac_dinh) });
      toast('Cập nhật thành công', 'success'); closeModal(); load();
    });
    openModal('Sửa loại phòng', form);
  }

  function confirmDelete(rt) {
    confirmDialog(`Xóa loại phòng "${rt.ten_loai_phong}"?`, async () => {
      try { await api.delete('/room-types/' + rt.id); toast('Xóa thành công', 'success'); load(); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  await load();
}
