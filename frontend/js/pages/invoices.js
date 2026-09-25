import { api, downloadBlob } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { formatCurrency, formatDate, PAYMENT_STATUS, badge } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { toast, confirmDialog, buildForm, renderTable, renderPagination, openModal, closeModal } from '../components/ui.js';

export async function renderInvoices(container, query = {}) {
  setPageTitle('Hóa đơn');
  let currentPage = parseInt(query.page || '1', 10);

  async function load() {
    showLoading(container);
    const res = await api.get('/invoices?page=' + currentPage + '&limit=20');
    clear(container);
    const toolbar = el('div', { class: 'toolbar' },
      el('button', { class: 'btn btn-primary', onclick: () => showGenerateModal() }, '+ Lập hóa đơn'),
    );
    container.appendChild(toolbar);
    const tableDiv = el('div');
    renderTable(tableDiv, {
      columns: [
        { label: 'ID', key: 'id' },
        { label: 'Booking', render: r => `#${r.dat_phong_id}` },
        { label: 'Khách hàng', render: r => r.ten_khach || '-' },
        { label: 'Phòng', render: r => r.so_phong || '-' },
        { label: 'Tiền phòng', render: r => formatCurrency(r.tong_tien_phong) },
        { label: 'Tiền dịch vụ', render: r => formatCurrency(r.tong_tien_dich_vu) },
        { label: 'Tổng cộng', render: r => formatCurrency(r.tong_cong) },
        { label: 'Thanh toán', render: r => { const info = PAYMENT_STATUS[r.trang_thai_thanh_toan]; return el('span', { class: `badge ${info?.class || 'badge-muted'}` }, info?.label || r.trang_thai_thanh_toan); } },
      ],
      rows: res.data || [],
      actions: (row) => [
        el('button', { class: 'btn btn-secondary btn-sm', onclick: () => showDetail(row) }, 'Chi tiết'),
        el('button', { class: 'btn btn-secondary btn-sm', onclick: () => downloadPdf(row) }, 'PDF'),
        row.trang_thai_thanh_toan !== 'DaThanhToan' ? el('button', { class: 'btn btn-success btn-sm', onclick: () => showPaymentModal(row) }, 'Thanh toán') : null,
      ],
    });
    container.appendChild(tableDiv);
    const pagination = el('div', { class: 'pagination' });
    renderPagination(pagination, { page: res.page, totalPages: res.totalPages, total: res.total, limit: res.limit, onPage: (p) => { currentPage = p; load(); } });
    container.appendChild(pagination);
  }

  async function showGenerateModal() {
    try {
      // co_hoa_don được trả kèm trong danh sách booking — không cần gọi
      // by-booking cho từng booking nữa (đã loại bỏ N+1).
      const bookingRes = await api.get('/bookings?trang_thai=DangO&limit=100');
      const bookingsWithoutInvoice = (bookingRes.data || []).filter(b => !b.co_hoa_don);
      if (bookingsWithoutInvoice.length === 0) {
        toast('Không có booking nào cần lập hóa đơn', 'info');
        return;
      }
      const { form } = buildForm([
        { name: 'dat_phong_id', label: 'Booking', type: 'select', required: true, options: bookingsWithoutInvoice.map(b => ({ value: b.id, label: `#${b.id} - ${b.ten_khach || b.ho_ten || 'Khách'} - Phòng ${b.so_phong || ''}` })) },
      ], async (data) => {
        const res = await api.post('/invoices', { dat_phong_id: parseInt(data.dat_phong_id, 10) });
        toast(`Đã lập hóa đơn #${res.data.id}`, 'success'); closeModal(); load();
      });
      openModal('Lập hóa đơn mới', form);
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  async function showDetail(inv) {
    const res = await api.get('/invoices/' + inv.id);
    const data = res.data;
    const payRes = await api.get('/invoices/' + inv.id + '/payments');
    const body = el('div', {},
      el('div', { class: 'detail-grid' },
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Mã hóa đơn'), el('div', { class: 'detail-value' }, `#${data.id}`)),
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Booking'), el('div', { class: 'detail-value' }, `#${data.dat_phong_id}`)),
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Khách hàng'), el('div', { class: 'detail-value' }, data.ten_khach || '-')),
        el('div', { class: 'detail-item' }, el('div', { class: 'detail-label' }, 'Phòng'), el('div', { class: 'detail-value' }, data.so_phong || '-')),
      ),
      el('div', { class: 'invoice-section', style: { marginTop: '16px' } },
        el('h4', {}, 'Chi tiết giá'),
        el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Tiền phòng'), el('span', {}, formatCurrency(data.tong_tien_phong))),
        el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Tiền dịch vụ'), el('span', {}, formatCurrency(data.tong_tien_dich_vu))),
        el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Thuế VAT'), el('span', {}, formatCurrency(data.thue_vat))),
        el('div', { class: 'dashboard-list-item' }, el('span', {}, 'Tổng cộng'), el('span', {}, formatCurrency(data.tong_cong))),
      ),
      payRes.data?.length ? el('div', { class: 'invoice-section' },
        el('h4', {}, 'Lịch sử thanh toán'),
        ...payRes.data.map(p => el('div', { class: 'dashboard-list-item' },
          el('span', {}, `${formatDate(p.thoi_gian)} - ${p.hinh_thuc === 'TienMat' ? 'Tiền mặt' : p.hinh_thuc === 'ChuyenKhoan' ? 'Chuyển khoản' : 'Thẻ'}`),
          el('span', {}, formatCurrency(p.so_tien))
        ))
      ) : null,
      el('div', { style: { marginTop: '16px', display: 'flex', gap: '8px' } },
        el('button', { class: 'btn btn-secondary', onclick: () => { closeModal(); downloadPdf(inv); } }, '📥 Tải PDF'),
      ),
    );
    openModal(`Hóa đơn #${data.id}`, body, { large: true });
  }

  async function downloadPdf(inv) {
    try {
      const blob = await api.download('/invoices/' + inv.id + '/pdf');
      downloadBlob(blob, `hoa-don-${inv.id}.pdf`);
      toast('Đã tải PDF', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function showPaymentModal(inv) {
    const remaining = Number(inv.tong_cong) - (inv.paid_amount || 0);
    const { form } = buildForm([
      { name: 'so_tien', label: 'Số tiền (VNĐ)', type: 'number', required: true, min: 1, step: 1, value: remaining, hint: `Còn lại: ${formatCurrency(remaining)}` },
      { name: 'hinh_thuc', label: 'Hình thức', type: 'select', required: true, options: [{ value: 'TienMat', label: 'Tiền mặt' }, { value: 'ChuyenKhoan', label: 'Chuyển khoản' }, { value: 'The', label: 'Thẻ' }] },
      { name: 'ghi_chu', label: 'Ghi chú' },
    ], async (data) => {
      await api.post('/invoices/' + inv.id + '/payments', { so_tien: parseFloat(data.so_tien), hinh_thuc: data.hinh_thuc, ghi_chu: data.ghi_chu });
      toast('Thanh toán thành công', 'success'); closeModal(); load();
    });
    openModal('Thanh toán', form);
  }

  await load();
}
