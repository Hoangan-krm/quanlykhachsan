import { api } from '../services/api.js';
import { el, clear, showLoading, showEmpty } from '../utils/dom.js';
import { formatCurrency, ROOM_STATUS, badge } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { toast, confirmDialog, buildForm, renderTable, renderPagination, openModal, closeModal } from '../components/ui.js';
import { authService } from '../services/auth.js';

export async function renderRooms(container, query = {}) {
  setPageTitle('Quản lý phòng');
  const canEdit = authService.hasRole('Admin');
  let currentPage = parseInt(query.page || '1', 10);
  let currentStatus = query.trang_thai || '';
  let currentType = query.loai_phong_id || '';

  async function load() {
    showLoading(container);
    const params = new URLSearchParams({ page: currentPage, limit: 20 });
    if (currentStatus) params.set('trang_thai', currentStatus);
    if (currentType) params.set('loai_phong_id', currentType);
    const res = await api.get('/rooms?' + params.toString());
    renderPage(res);
  }

  function renderPage(res) {
    clear(container);
    const toolbar = el('div', { class: 'toolbar' },
      el('div', { class: 'search-box' }, el('span', {}, '🔍'),
        el('select', { class: 'filter-select', onchange: (e) => { currentStatus = e.target.value; currentPage = 1; load(); } },
          el('option', { value: '' }, 'Tất cả trạng thái'),
          ...Object.entries(ROOM_STATUS).map(([k, v]) => el('option', { value: k, selected: currentStatus === k }, v.label))
        )
      ),
      canEdit ? el('button', { class: 'btn btn-primary', onclick: () => showCreateModal() }, '+ Thêm phòng') : null
    );
    container.appendChild(toolbar);

    const tableContainer = el('div');
    renderTable(tableContainer, {
      columns: [
        { label: 'Số phòng', key: 'so_phong' },
        { label: 'Loại phòng', render: r => r.ten_loai_phong || '-' },
        { label: 'Giá', render: r => formatCurrency(r.gia_mac_dinh) },
        { label: 'Trạng thái', render: r => { const info = ROOM_STATUS[r.trang_thai]; return el('span', { class: `badge ${info?.class || 'badge-muted'}` }, info?.label || r.trang_thai); } },
      ],
      rows: res.data || [],
      actions: canEdit ? (row) => [
        el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showEditModal(row) }, 'Sửa'),
        row.trang_thai !== 'BaoTri' ? el('button', { class: 'btn btn-warning btn-sm', onclick: () => toggleMaintenance(row) }, 'Bảo trì') : el('button', { class: 'btn btn-success btn-sm', onclick: () => toggleMaintenance(row) }, 'Hủy bảo trì'),
        row.trang_thai === 'DangDon' ? el('button', { class: 'btn btn-success btn-sm', onclick: () => markCleaned(row) }, 'Đã dọn') : null,
        row.trang_thai === 'Trong' || row.trang_thai === 'BaoTri' ? el('button', { class: 'btn btn-danger btn-sm', onclick: () => confirmDelete(row) }, 'Xóa') : null,
      ] : (row) => [
        row.trang_thai === 'DangDon' ? el('button', { class: 'btn btn-success btn-sm', onclick: () => markCleaned(row) }, 'Đã dọn') : null,
      ]
    });
    container.appendChild(tableContainer);

    const pagination = el('div', { class: 'pagination' });
    renderPagination(pagination, { page: res.page, totalPages: res.totalPages, total: res.total, limit: res.limit, onPage: (p) => { currentPage = p; load(); } });
    container.appendChild(pagination);
  }

  async function showCreateModal() {
    const typesRes = await api.get('/room-types');
    const { form } = buildForm([
      { name: 'so_phong', label: 'Số phòng', required: true, placeholder: 'VD: 101' },
      { name: 'loai_phong_id', label: 'Loại phòng', type: 'select', required: true, options: typesRes.data.map(t => ({ value: t.id, label: t.ten_loai_phong })) },
      { name: 'trang_thai', label: 'Trạng thái', type: 'select', options: Object.entries(ROOM_STATUS).map(([k, v]) => ({ value: k, label: v.label })), value: 'Trong' },
    ], async (data) => {
      await api.post('/rooms', { ...data, loai_phong_id: parseInt(data.loai_phong_id, 10) });
      toast('Tạo phòng thành công', 'success');
      closeModal(); load();
    });
    openModal('Thêm phòng', form);
  }

  async function showEditModal(room) {
    const typesRes = await api.get('/room-types');
    const { form } = buildForm([
      { name: 'so_phong', label: 'Số phòng', required: true, value: room.so_phong },
      { name: 'loai_phong_id', label: 'Loại phòng', type: 'select', required: true, value: room.loai_phong_id, options: typesRes.data.map(t => ({ value: t.id, label: t.ten_loai_phong })) },
      { name: 'trang_thai', label: 'Trạng thái', type: 'select', value: room.trang_thai, options: Object.entries(ROOM_STATUS).map(([k, v]) => ({ value: k, label: v.label })) },
    ], async (data) => {
      await api.put('/rooms/' + room.id, { ...data, loai_phong_id: parseInt(data.loai_phong_id, 10) });
      toast('Cập nhật thành công', 'success');
      closeModal(); load();
    });
    openModal('Sửa phòng', form);
  }

  function confirmDelete(room) {
    confirmDialog(`Xóa phòng ${room.so_phong}?`, async () => {
      try { await api.delete('/rooms/' + room.id); toast('Xóa thành công', 'success'); load(); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  async function toggleMaintenance(room) {
    const action = room.trang_thai === 'BaoTri' ? 'Hủy bảo trì' : 'Đặt bảo trì';
    confirmDialog(`${action} phòng ${room.so_phong}?`, async () => {
      try {
        if (room.trang_thai === 'BaoTri') {
          await api.patch('/rooms/' + room.id + '/status', { trang_thai: 'Trong' });
        } else {
          await api.patch('/rooms/' + room.id + '/maintenance', {});
        }
        toast('Thành công', 'success'); load();
      } catch (err) { toast(err.message, 'error'); }
    });
  }

  async function markCleaned(room) {
    try { await api.patch('/rooms/' + room.id + '/cleaned', {}); toast('Đã đánh dấu dọn xong', 'success'); load(); }
    catch (err) { toast(err.message, 'error'); }
  }

  await load();
}
