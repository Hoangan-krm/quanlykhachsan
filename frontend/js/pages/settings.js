import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { setPageTitle } from '../components/layout.js';
import { toast, buildForm, openModal, closeModal } from '../components/ui.js';

export async function renderSettings(container) {
  setPageTitle('Cấu hình');
  showLoading(container);
  try {
    const res = await api.get('/config');
    const config = res.data;
    clear(container);
    const { form } = buildForm([
      { name: 'ten_khach_san', label: 'Tên khách sạn', required: true, value: config.ten_khach_san },
      { name: 'dia_chi', label: 'Địa chỉ', required: true, value: config.dia_chi },
      { name: 'logo', label: 'Logo (URL)', type: 'url', value: config.logo || '', placeholder: 'https://...' },
      { name: 'vat', label: 'Thuế VAT (0-1)', type: 'number', required: true, min: 0, max: 1, step: 0.01, value: config.vat },
      { name: 'ma_hoa_don_mau', label: 'Mẫu số hóa đơn', required: true, value: config.ma_hoa_don_mau || 'HD', placeholder: 'VD: HD001' },
      { name: 'no_show_deposit_policy', label: 'Tiền cọc khi khách vắng mặt', type: 'select', value: config.no_show_deposit_policy || 'Giu', options: [{ value: 'Giu', label: 'Giữ tiền cọc' }, { value: 'Hoan', label: 'Hoàn tiền cọc' }] },
      { name: 'phi_tra_muon', label: 'Phí trả phòng muộn (VNĐ)', type: 'number', min: 0, required: true, value: config.phi_tra_muon || 0 },
      { name: 'check_in_time', label: 'Giờ check-in', value: config.check_in_time || '14:00' },
      { name: 'check_out_time', label: 'Giờ check-out', value: config.check_out_time || '12:00' },
    ], async (data) => {
      await api.put('/config', { ...data, vat: parseFloat(data.vat), phi_tra_muon: Number(data.phi_tra_muon) });
      toast('Cập nhật cấu hình thành công', 'success'); closeModal(); load();
    }, 'Lưu cấu hình');
    container.appendChild(el('div', { class: 'card' }, el('div', { class: 'card-header' }, el('h3', { class: 'card-title' }, 'Cấu hình khách sạn')), form));
  } catch (err) {
    clear(container);
    container.appendChild(el('div', { class: 'error-state' }, el('p', {}, err.message)));
  }

  async function load() { return renderSettings(container); }
}
