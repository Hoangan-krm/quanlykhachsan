import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { setPageTitle } from '../components/layout.js';
import { toast, confirmDialog, buildForm, renderTable, openModal, closeModal } from '../components/ui.js';

export async function renderPromos(container) {
  setPageTitle('Mã giảm giá');

  async function load() {
    showLoading(container);
    const res = await api.get('/promos');
    clear(container);
    container.appendChild(el('div', { class: 'toolbar' }, el('button', { class: 'btn btn-primary', onclick: () => showCreateModal() }, '+ Thêm mã')));
    const tableDiv = el('div');
    renderTable(tableDiv, {
      columns: [
        { label: 'Mã', render: r => el('span', { class: 'badge badge-primary' }, r.ma) },
        { label: 'Phần trăm (%)', render: r => r.phan_tram + '%' },
        { label: 'Trạng thái', render: r => el('span', { class: `badge ${r.trang_thai === 'Active' ? 'badge-success' : 'badge-muted'}` }, r.trang_thai === 'Active' ? 'Hoạt động' : 'Ngừng') },
      ],
      rows: res.data || [],
      actions: (row) => [
        el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showEditModal(row) }, 'Sửa'),
        el('button', { class: 'btn btn-danger btn-sm', onclick: () => confirmDelete(row) }, 'Xóa'),
      ]
    });
    container.appendChild(tableDiv);
  }

  function showCreateModal() {
    const { form } = buildForm([
      { name: 'ma', label: 'Mã giảm giá', required: true, placeholder: 'VD: WELCOME10' },
      { name: 'phan_tram', label: 'Phần trăm (%)', type: 'number', required: true, min: 0, max: 100, step: 1, value: 10 },
      { name: 'trang_thai', label: 'Trạng thái', type: 'select', value: 'Active', options: [{ value: 'Active', label: 'Hoạt động' }, { value: 'Inactive', label: 'Ngừng' }] },
    ], async (data) => {
      await api.post('/promos', { ...data, phan_tram: parseFloat(data.phan_tram) });
      toast('Tạo thành công', 'success'); closeModal(); load();
    });
    openModal('Thêm mã giảm giá', form);
  }

  function showEditModal(p) {
    const { form } = buildForm([
      { name: 'ma', label: 'Mã giảm giá', required: true, value: p.ma },
      { name: 'phan_tram', label: 'Phần trăm (%)', type: 'number', required: true, min: 0, max: 100, step: 1, value: p.phan_tram },
      { name: 'trang_thai', label: 'Trạng thái', type: 'select', value: p.trang_thai, options: [{ value: 'Active', label: 'Hoạt động' }, { value: 'Inactive', label: 'Ngừng' }] },
    ], async (data) => {
      await api.put('/promos/' + p.id, { ...data, phan_tram: parseFloat(data.phan_tram) });
      toast('Cập nhật thành công', 'success'); closeModal(); load();
    });
    openModal('Sửa mã giảm giá', form);
  }

  function confirmDelete(p) {
    confirmDialog(`Xóa mã "${p.ma}"?`, async () => {
      try { await api.delete('/promos/' + p.id); toast('Xóa thành công', 'success'); load(); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  await load();
}
