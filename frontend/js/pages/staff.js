import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { ROLE_LABELS } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { toast, confirmDialog, buildForm, renderTable, renderPagination, openModal, closeModal } from '../components/ui.js';

export async function renderStaff(container, query = {}) {
  setPageTitle('Nhân viên');
  let currentPage = parseInt(query.page || '1', 10);

  async function load() {
    showLoading(container);
    const res = await api.get('/staff?page=' + currentPage + '&limit=20');
    clear(container);
    container.appendChild(el('div', { class: 'toolbar' }, el('button', { class: 'btn btn-primary', onclick: () => showCreateModal() }, '+ Thêm nhân viên')));
    const tableDiv = el('div');
    renderTable(tableDiv, {
      columns: [
        { label: 'Họ tên', key: 'ho_ten' },
        { label: 'Email', key: 'email' },
        { label: 'Vai trò', render: r => ROLE_LABELS[r.vai_tro] || r.vai_tro },
        { label: 'Trạng thái', render: r => el('span', { class: `badge ${r.trang_thai === 'Active' ? 'badge-success' : 'badge-danger'}` }, r.trang_thai === 'Active' ? 'Hoạt động' : 'Khóa') },
      ],
      rows: res.data || [],
      actions: (row) => [
        el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showEditModal(row) }, 'Sửa'),
        row.trang_thai === 'Active' ? el('button', { class: 'btn btn-warning btn-sm', onclick: () => toggleLock(row, 'lock') }, 'Khóa') : el('button', { class: 'btn btn-success btn-sm', onclick: () => toggleLock(row, 'unlock') }, 'Mở khóa'),
        el('button', { class: 'btn btn-danger btn-sm', onclick: () => confirmDelete(row) }, 'Xóa'),
      ]
    });
    container.appendChild(tableDiv);
    const pagination = el('div', { class: 'pagination' });
    renderPagination(pagination, { page: res.page, totalPages: res.totalPages, total: res.total, limit: res.limit, onPage: (p) => { currentPage = p; load(); } });
    container.appendChild(pagination);
  }

  function showCreateModal() {
    const { form } = buildForm([
      { name: 'ho_ten', label: 'Họ tên', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Mật khẩu (ít nhất 8 ký tự, có chữ hoa và số)', type: 'password', required: true },
      { name: 'vai_tro', label: 'Vai trò', type: 'select', required: true, options: [{ value: 'Admin', label: 'Quản trị viên' }, { value: 'QuanLy', label: 'Quản lý' }, { value: 'LeTan', label: 'Lễ tân' }] },
    ], async (data) => {
      await api.post('/staff', data);
      toast('Tạo thành công', 'success'); closeModal(); load();
    });
    openModal('Thêm nhân viên', form);
  }

  function showEditModal(s) {
    const { form } = buildForm([
      { name: 'ho_ten', label: 'Họ tên', required: true, value: s.ho_ten },
      { name: 'email', label: 'Email', type: 'email', required: true, value: s.email },
      { name: 'vai_tro', label: 'Vai trò', type: 'select', required: true, value: s.vai_tro, options: [{ value: 'Admin', label: 'Quản trị viên' }, { value: 'QuanLy', label: 'Quản lý' }, { value: 'LeTan', label: 'Lễ tân' }] },
    ], async (data) => {
      await api.put('/staff/' + s.id, data);
      toast('Cập nhật thành công', 'success'); closeModal(); load();
    });
    openModal('Sửa nhân viên', form);
  }

  async function toggleLock(s, action) {
    try { await api.patch(`/staff/${s.id}/${action}`); toast('Thành công', 'success'); load(); }
    catch (err) { toast(err.message, 'error'); }
  }

  function confirmDelete(s) {
    confirmDialog(`Xóa nhân viên "${s.ho_ten}"?`, async () => {
      try { await api.delete('/staff/' + s.id); toast('Xóa thành công', 'success'); load(); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  await load();
}
