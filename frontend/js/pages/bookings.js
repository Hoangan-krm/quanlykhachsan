import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { formatCurrency, formatDate, formatDateTime, daysBetween, BOOKING_STATUS, badge } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { toast, confirmDialog, buildForm, renderTable, renderPagination, openModal, closeModal } from '../components/ui.js';

export async function renderBookings(container, query = {}) {
  setPageTitle('Đặt phòng');
  let currentPage = parseInt(query.page || '1', 10);
  let currentStatus = query.trang_thai || '';

  async function load() {
    showLoading(container);
    const params = new URLSearchParams({ page: currentPage, limit: 20 });
    if (currentStatus) params.set('trang_thai', currentStatus);
    const res = await api.get('/bookings?' + params.toString());
    clear(container);
    const toolbar = el('div', { class: 'toolbar' },
      el('div', { class: 'search-box' }, el('span', {}, '🔍'),
        el('select', { class: 'filter-select', onchange: (e) => { currentStatus = e.target.value; currentPage = 1; load(); } },
          el('option', { value: '' }, 'Tất cả trạng thái'),
          ...Object.entries(BOOKING_STATUS).map(([k, v]) => el('option', { value: k, selected: currentStatus === k }, v.label))
        )
      ),
      el('button', { class: 'btn btn-primary', onclick: () => showCreateModal() }, '+ Đặt phòng')
    );
    container.appendChild(toolbar);
    const tableDiv = el('div');
    renderTable(tableDiv, {
      columns: [
        { label: 'ID', key: 'id' },
        { label: 'Khách hàng', render: r => r.ten_khach || r.ho_ten || '-' },
        { label: 'Phòng', render: r => r.so_phong || '-' },
        { label: 'Check-in', render: r => formatDate(r.ngay_check_in) },
        { label: 'Check-out', render: r => formatDate(r.ngay_check_out) },
        { label: 'Số ngày ở', render: r => renderStayDaysBadge(r) },
        { label: 'Tiền cọc', render: r => formatCurrency(r.tien_coc) },
        { label: 'Trạng thái', render: r => { const info = BOOKING_STATUS[r.trang_thai]; return el('span', { class: `badge ${info?.class || 'badge-muted'}` }, info?.label || r.trang_thai); } },
      ],
      rows: res.data || [],
      actions: (row) => buildActions(row)
    });
    container.appendChild(tableDiv);
    const pagination = el('div', { class: 'pagination' });
    renderPagination(pagination, { page: res.page, totalPages: res.totalPages, total: res.total, limit: res.limit, onPage: (p) => { currentPage = p; load(); } });
    container.appendChild(pagination);
  }

  function renderStayDaysBadge(r) {
    const dem = daysBetween(r.ngay_check_in, r.ngay_check_out);
    if (dem <= 0) return el('span', { class: 'badge badge-muted' }, '—');
    return el('span', { class: 'badge badge-info' }, `${dem} đêm / ${dem + 1} ngày`);
  }

  function buildActions(row) {
    const acts = [];
    acts.push(el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showDetail(row) }, 'Chi tiết'));
    acts.push(el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showStayDaysModal(row) }, 'Tính số ngày'));
    if (['ChoXacNhan', 'DaDat'].includes(row.trang_thai)) {
      acts.push(el('button', { class: 'btn btn-success btn-sm', onclick: () => doAction(row, 'check-in', 'Nhận phòng') }, 'Nhận phòng'));
      acts.push(el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showEditModal(row) }, 'Sửa'));
      acts.push(el('button', { class: 'btn btn-warning btn-sm', onclick: () => doAction(row, 'cancel', 'Hủy đặt phòng') }, 'Hủy'));
      acts.push(el('button', { class: 'btn btn-danger btn-sm', onclick: () => doAction(row, 'no-show', 'Đánh dấu vắng mặt') }, 'Vắng mặt'));
    }
    if (row.trang_thai === 'DangO') {
      acts.push(el('button', { class: 'btn btn-primary btn-sm', onclick: () => doAction(row, 'check-out', 'Trả phòng') }, 'Trả phòng'));
      acts.push(el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showAddServiceModal(row) }, '+ Dịch vụ'));
      acts.push(el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showTransferModal(row) }, 'Chuyển phòng'));
      acts.push(el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showExtendModal(row) }, 'Gia hạn'));
      acts.push(el('button', { class: 'btn btn-success btn-sm', onclick: () => generateInvoice(row) }, 'Lập hóa đơn'));
    }
    return acts;
  }

  async function doAction(row, action, label) {
    confirmDialog(`${label} cho booking #${row.id}?`, async () => {
      try { await api.post(`/bookings/${row.id}/${action}`); toast(`${label} thành công`, 'success'); load(); }
      catch (err) { toast(err.message, 'error'); }
    });
  }

  async function showCreateModal() {
    const [custRes, roomRes] = await Promise.all([api.get('/customers?limit=100'), api.get('/rooms?trang_thai=Trong&limit=100')]);
    const { form } = buildForm([
      { name: 'khach_hang_id', label: 'Khách hàng', type: 'select', required: true, options: (custRes.data || []).map(c => ({ value: c.id, label: `${c.ho_ten} - ${c.sdt}` })) },
      { name: 'phong_id', label: 'Phòng', type: 'select', required: true, options: (roomRes.data || []).map(r => ({ value: r.id, label: `${r.so_phong} (${r.ten_loai_phong})` })) },
      { name: 'ngay_check_in', label: 'Ngày check-in', type: 'date', required: true },
      { name: 'ngay_check_out', label: 'Ngày check-out', type: 'date', required: true },
      { name: 'tien_coc', label: 'Tiền cọc (VNĐ)', type: 'number', min: 0, step: 1, value: 0 },
    ], async (data) => {
      await api.post('/bookings', { ...data, khach_hang_id: parseInt(data.khach_hang_id, 10), phong_id: parseInt(data.phong_id, 10), tien_coc: parseFloat(data.tien_coc) || 0 });
      toast('Đặt phòng thành công', 'success'); closeModal(); load();
    });
    openModal('Đặt phòng mới', form);
  }

  async function showDetail(row) {
    const res = await api.get('/bookings/' + row.id);
    const b = res.data;
    const body = el('div', {},
      el('div', { class: 'detail-grid' },
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'ID'), el('div', { class: 'detail-value' }, b.id)),
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Khách hàng'), el('div', { class: 'detail-value' }, b.ten_khach || b.ho_ten || '-')),
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Phòng'), el('div', { class: 'detail-value' }, b.so_phong || '-')),
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Loại phòng'), el('div', { class: 'detail-value' }, b.ten_loai_phong || '-')),
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Check-in'), el('div', { class: 'detail-value' }, formatDate(b.ngay_check_in))),
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Check-out'), el('div', { class: 'detail-value' }, formatDate(b.ngay_check_out))),
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Số ngày ở'), el('div', { class: 'detail-value' }, renderStayDaysDetail(b))),
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Tiền cọc'), el('div', { class: 'detail-value' }, formatCurrency(b.tien_coc))),
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Trạng thái'), el('div', { class: 'detail-value' }, BOOKING_STATUS[b.trang_thai]?.label || b.trang_thai)),
      ),
      b.services?.length ? el('div', { style: { marginTop: '16px' } },
        el('h4', { style: { marginBottom: '8px' } }, 'Dịch vụ sử dụng'),
        ...b.services.map(s => el('div', { class: 'dashboard-list-item' },
          el('span', {}, `${s.ten_dich_vu} x${s.so_luong}`),
          el('span', {}, formatCurrency(s.thanh_tien))
        ))
      ) : null,
      b.invoice ? el('div', { style: { marginTop: '16px' } },
        el('h4', { style: { marginBottom: '8px' } }, 'Hóa đơn'),
        el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Tiền phòng'), el('span', {}, formatCurrency(b.invoice.tong_tien_phong))),
        el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Tiền dịch vụ'), el('span', {}, formatCurrency(b.invoice.tong_tien_dich_vu))),
        el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Thuế VAT'), el('span', {}, formatCurrency(b.invoice.thue_vat))),
        el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Tổng cộng'), el('span', {}, formatCurrency(b.invoice.tong_cong))),
      ) : null,
    );
    openModal(`Chi tiết booking #${b.id}`, body, { large: true });
  }

  async function showAddServiceModal(row) {
    const svcRes = await api.get('/services/active');
    const { form } = buildForm([
      { name: 'dich_vu_id', label: 'Dịch vụ', type: 'select', required: true, options: (svcRes.data || []).map(s => ({ value: s.id, label: `${s.ten_dich_vu} - ${formatCurrency(s.don_gia)}/${s.don_vi_tinh}` })) },
      { name: 'so_luong', label: 'Số lượng', type: 'number', required: true, min: 1, value: 1 },
    ], async (data) => {
      await api.post(`/bookings/${row.id}/services`, { dich_vu_id: parseInt(data.dich_vu_id, 10), so_luong: parseInt(data.so_luong, 10) });
      toast('Thêm dịch vụ thành công', 'success'); closeModal(); load();
    });
    openModal('Thêm dịch vụ', form);
  }

  async function showTransferModal(row) {
    const roomRes = await api.get('/rooms?trang_thai=Trong&limit=100');
    const { form } = buildForm([
      { name: 'new_phong_id', label: 'Phòng mới', type: 'select', required: true, options: (roomRes.data || []).filter(r => r.id !== row.phong_id).map(r => ({ value: r.id, label: `${r.so_phong} (${r.ten_loai_phong})` })) },
    ], async (data) => {
      await api.post(`/bookings/${row.id}/transfer-room`, { new_phong_id: parseInt(data.new_phong_id, 10) });
      toast('Chuyển phòng thành công', 'success'); closeModal(); load();
    });
    openModal('Chuyển phòng', form);
  }

  async function showEditModal(row) {
    const [custRes, roomRes] = await Promise.all([api.get('/customers?limit=100'), api.get('/rooms?limit=100')]);
    const { form } = buildForm([
      { name: 'khach_hang_id', label: 'Khách hàng', type: 'select', required: true, value: row.khach_hang_id, options: (custRes.data || []).map(c => ({ value: c.id, label: `${c.ho_ten} - ${c.sdt}` })) },
      { name: 'phong_id', label: 'Phòng', type: 'select', required: true, value: row.phong_id, options: (roomRes.data || []).map(r => ({ value: r.id, label: `${r.so_phong} (${r.ten_loai_phong || ''})` })) },
      { name: 'ngay_check_in', label: 'Ngày check-in', type: 'date', required: true, value: row.ngay_check_in?.slice(0, 10) || '' },
      { name: 'ngay_check_out', label: 'Ngày check-out', type: 'date', required: true, value: row.ngay_check_out?.slice(0, 10) || '' },
      { name: 'tien_coc', label: 'Tiền cọc (VNĐ)', type: 'number', min: 0, step: 1, value: row.tien_coc || 0 },
    ], async (data) => {
      await api.put('/bookings/' + row.id, { ...data, khach_hang_id: parseInt(data.khach_hang_id, 10), phong_id: parseInt(data.phong_id, 10), tien_coc: parseFloat(data.tien_coc) || 0 });
      toast('Cập nhật đặt phòng thành công', 'success'); closeModal(); load();
    });
    openModal('Sửa đặt phòng #' + row.id, form);
  }

  async function showExtendModal(row) {
    const { form } = buildForm([
      { name: 'ngay_check_out', label: 'Ngày trả phòng mới', type: 'date', required: true, value: row.ngay_check_out?.slice(0, 10) || '' },
    ], async (data) => {
      await api.put('/bookings/' + row.id + '/extend', { ngay_check_out: data.ngay_check_out });
      toast('Gia hạn thành công', 'success'); closeModal(); load();
    });
    openModal('Gia hạn lưu trú #' + row.id, form);
  }

  function renderStayDaysDetail(b) {
    const dem = daysBetween(b.ngay_check_in, b.ngay_check_out);
    if (dem <= 0) return '—';
    return `${dem} đêm / ${dem + 1} ngày`;
  }

  async function showStayDaysModal(row) {
    try {
      const res = await api.get('/bookings/' + row.id + '/stay-days');
      const d = res.data;
      const body = el('div', {},
        el('div', { class: 'detail-grid' },
          el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Booking ID'), el('div', { class: 'detail-value' }, d.booking_id)),
          el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Khách hàng'), el('div', { class: 'detail-value' }, d.ten_khach || '-')),
          el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Phòng'), el('div', { class: 'detail-value' }, `${d.so_phong} - ${d.ten_loai_phong || '-'}`)),
          el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Trạng thái'), el('div', { class: 'detail-value' }, BOOKING_STATUS[d.trang_thai]?.label || d.trang_thai)),
          el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Ngày check-in'), el('div', { class: 'detail-value' }, formatDate(d.ngay_check_in))),
          el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Ngày check-out'), el('div', { class: 'detail-value' }, formatDate(d.ngay_check_out))),
        ),
        el('div', { class: 'stay-days-summary', style: { marginTop: '16px', padding: '12px', background: 'var(--color-bg-muted, #f5f5f5)', borderRadius: '8px' } },
          el('h4', { style: { marginBottom: '12px' } }, 'Kết quả tính số ngày ở'),
          el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Số đêm lưu trú'), el('span', { style: { fontWeight: 'bold' } }, `${d.so_dem} đêm`)),
          el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Số ngày ở (bao gồm ngày nhận và ngày trả)'), el('span', { style: { fontWeight: 'bold' } }, `${d.so_ngay_o} ngày`)),
          d.trang_thai === 'DangO' || d.trang_thai === 'DaTra' ? el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Số ngày đã ở'), el('span', { style: { fontWeight: 'bold' } }, `${d.so_ngay_da_o} ngày`)) : null,
          d.trang_thai === 'DangO' || d.trang_thai === 'DaTra' ? el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Số ngày còn lại'), el('span', { style: { fontWeight: 'bold' } }, `${d.so_ngay_con_lai} ngày`)) : null,
        ),
        el('div', { style: { marginTop: '16px' } },
          el('h4', { style: { marginBottom: '8px' } }, 'Ước tính tiền phòng'),
          el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Giá mỗi đêm'), el('span', {}, formatCurrency(d.gia_moi_dem))),
          el('div', { class: 'dashboard-list-item' }, el('span', {}, `${d.so_dem} đêm × ${formatCurrency(d.gia_moi_dem)}`), el('span', { style: { fontWeight: 'bold' } }, formatCurrency(d.tien_phong_uoc_tinh))),
          el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Tiền cọc đã thu'), el('span', {}, formatCurrency(d.tien_coc))),
          el('div', { class: 'dashboard-list-item' }, el('span', { style: { fontWeight: 'bold' } }, 'Còn phải thu (ước tính)'), el('span', { style: { fontWeight: 'bold', color: 'var(--color-danger, #dc3545)' } }, formatCurrency(Math.max(0, d.tien_phong_uoc_tinh - d.tien_coc)))),
        ),
      );
      openModal(`Tính số ngày ở — Booking #${d.booking_id}`, body, { large: true });
    } catch (err) {
      toast(err.message || 'Không thể tính số ngày ở', 'error');
    }
  }

  async function generateInvoice(row) {
    confirmDialog(`Lập hóa đơn cho booking #${row.id}?`, async () => {
      try {
        const res = await api.post('/invoices', { dat_phong_id: row.id });
        toast(`Đã lập hóa đơn #${res.data.id}`, 'success');
      } catch (err) {
        if (err.code === 'DUPLICATE_INVOICE' || err.statusCode === 409) {
          toast('Hóa đơn đã tồn tại cho booking này', 'warning');
        } else {
          toast(err.message, 'error');
        }
      }
    });
  }

  await load();
}
