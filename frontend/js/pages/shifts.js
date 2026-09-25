import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { formatCurrency, formatDateTime } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { toast, buildForm, renderTable, renderPagination, openModal, closeModal } from '../components/ui.js';
import { authService } from '../services/auth.js';

export async function renderShifts(container, query = {}) {
  setPageTitle('Ca làm việc');
  let currentPage = parseInt(query.page || '1', 10);
  const canManage = authService.hasRole('Admin', 'QuanLy', 'LeTan');

  async function load() {
    showLoading(container);
    const res = await api.get('/shifts?page=' + currentPage + '&limit=20');
    clear(container);
    if (canManage) {
      container.appendChild(el('div', { class: 'toolbar' }, el('button', { class: 'btn btn-primary', onclick: () => showOpenModal() }, '+ Mở ca')));
    }
    const tableDiv = el('div');
    renderTable(tableDiv, {
      columns: [
        { label: 'ID', key: 'id' },
        { label: 'Nhân viên', render: r => r.ten_nhan_vien || r.ho_ten || '-' },
        { label: 'Mở ca', render: r => formatDateTime(r.gio_mo_ca) },
        { label: 'Đóng ca', render: r => r.gio_dong_ca ? formatDateTime(r.gio_dong_ca) : '-' },
        { label: 'Tiền đầu ca', render: r => formatCurrency(r.tien_mat_dau_ca) },
        { label: 'Tiền cuối ca', render: r => r.tien_mat_cuoi_ca ? formatCurrency(r.tien_mat_cuoi_ca) : '-' },
        { label: 'Chênh lệch', render: r => r.chenh_lech != null ? formatCurrency(r.chenh_lech) : '-' },
      ],
      rows: res.data || [],
      actions: canManage ? (row) => [
        !row.gio_dong_ca ? el('button', { class: 'btn btn-warning btn-sm', onclick: () => showCloseModal(row) }, 'Đóng ca') : null,
      ] : null
    });
    container.appendChild(tableDiv);
    const pagination = el('div', { class: 'pagination' });
    renderPagination(pagination, { page: res.page, totalPages: res.totalPages, total: res.total, limit: res.limit, onPage: (p) => { currentPage = p; load(); } });
    container.appendChild(pagination);
  }

  function showOpenModal() {
    const { form } = buildForm([
      { name: 'tien_mat_dau_ca', label: 'Tiền mặt đầu ca (VNĐ)', type: 'number', required: true, min: 0, step: 1, value: 0 },
    ], async (data) => {
      await api.post('/shifts/open', { tien_mat_dau_ca: parseFloat(data.tien_mat_dau_ca) });
      toast('Mở ca thành công', 'success'); closeModal(); load();
    });
    openModal('Mở ca làm việc', form);
  }

  function showCloseModal(shift) {
    const { form } = buildForm([
      { name: 'tien_mat_cuoi_ca', label: 'Tiền mặt cuối ca (VNĐ)', type: 'number', required: true, min: 0, step: 1, value: 0 },
    ], async (data) => {
      await api.post('/shifts/' + shift.id + '/close', { tien_mat_cuoi_ca: parseFloat(data.tien_mat_cuoi_ca) });
      toast('Đóng ca thành công', 'success'); closeModal(); load();
    });
    openModal('Đóng ca', form);
  }

  await load();
}
