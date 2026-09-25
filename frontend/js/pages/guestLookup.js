import { api } from '../services/api.js';
import { el, clear } from '../utils/dom.js';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format.js';
import { showLoading, showError, showEmpty, clearState } from '../utils/uiState.js';
import { BOOKING_STATUS } from '../utils/format.js';

export async function renderGuestLookup(container, query = {}) {
  clear(container);

  const card = el('div', { class: 'guest-lookup-card' },
    el('h2', { class: 'guest-lookup-title' }, 'Tra cứu đặt phòng'),
    el('p', { class: 'guest-lookup-subtitle' }, 'Nhập mã đặt phòng và số điện thoại hoặc email để xem thông tin'),
    el('form', { class: 'guest-lookup-form', id: 'guest-lookup-form' },
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label', for: 'booking-code' }, 'Mã đặt phòng', el('span', { class: 'required' }, ' *')),
        el('input', { type: 'text', class: 'form-input', id: 'booking-code', name: 'booking_code', placeholder: 'Ví dụ: 1', required: true })
      ),
      el('div', { class: 'form-group' },
        el('label', { class: 'form-label', for: 'sdt-or-email' }, 'Số điện thoại hoặc email', el('span', { class: 'required' }, ' *')),
        el('input', { type: 'text', class: 'form-input', id: 'sdt-or-email', name: 'sdt_or_email', placeholder: 'SĐT hoặc email đã đăng ký', required: true })
      ),
      el('button', { type: 'submit', class: 'btn btn-primary', id: 'guest-lookup-submit' }, 'Tra cứu')
    ),
    el('div', { class: 'guest-lookup-result', id: 'guest-lookup-result' })
  );

  container.appendChild(card);

  const form = document.getElementById('guest-lookup-form');
  const result = document.getElementById('guest-lookup-result');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookingCode = document.getElementById('booking-code').value.trim();
    const sdtOrEmail = document.getElementById('sdt-or-email').value.trim();
    if (!bookingCode || !sdtOrEmail) return;
    await performLookup(result, bookingCode, sdtOrEmail);
  });
}

async function performLookup(container, bookingCode, sdtOrEmail) {
  const submitBtn = document.getElementById('guest-lookup-submit');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang tra cứu...'; }
  showLoading(container, 'Đang tra cứu đặt phòng...');
  try {
    const res = await api.post('/bookings/guest/lookup', { booking_code: bookingCode, sdt_or_email: sdtOrEmail });
    clearState(container);
    renderBookingResult(container, res.data);
  } catch (err) {
    if (err.statusCode === 404) {
      showEmpty(container, 'Không tìm thấy đặt phòng với thông tin đã cung cấp');
    } else {
      showError(container, err.message || 'Tra cứu thất bại', () => performLookup(container, bookingCode, sdtOrEmail));
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Tra cứu'; }
  }
}

function renderBookingResult(container, booking) {
  const statusInfo = BOOKING_STATUS[booking.trang_thai] || { label: booking.trang_thai, class: 'badge-muted' };
  const card = el('div', { class: 'booking-result-card' },
    el('div', { class: 'booking-result-header' },
      el('h3', {}, `Đặt phòng #${booking.id}`),
      el('span', { class: `badge ${statusInfo.class}` }, statusInfo.label)
    ),
    el('div', { class: 'booking-result-grid' },
      el('div', { class: 'booking-result-item' },
        el('span', { class: 'label' }, 'Khách hàng'),
        el('span', { class: 'value' }, booking.ho_ten || '-')
      ),
      el('div', { class: 'booking-result-item' },
        el('span', { class: 'label' }, 'Số điện thoại'),
        el('span', { class: 'value' }, booking.sdt || '-')
      ),
      el('div', { class: 'booking-result-item' },
        el('span', { class: 'label' }, 'Email'),
        el('span', { class: 'value' }, booking.email || '-')
      ),
      el('div', { class: 'booking-result-item' },
        el('span', { class: 'label' }, 'Phòng'),
        el('span', { class: 'value' }, `${booking.so_phong || '-'} — ${booking.ten_loai_phong || '-'}`)
      ),
      el('div', { class: 'booking-result-item' },
        el('span', { class: 'label' }, 'Ngày nhận phòng'),
        el('span', { class: 'value' }, formatDate(booking.ngay_check_in))
      ),
      el('div', { class: 'booking-result-item' },
        el('span', { class: 'label' }, 'Ngày trả phòng'),
        el('span', { class: 'value' }, formatDate(booking.ngay_check_out))
      ),
      el('div', { class: 'booking-result-item' },
        el('span', { class: 'label' }, 'Tiền cọc'),
        el('span', { class: 'value' }, formatCurrency(booking.tien_coc))
      ),
      el('div', { class: 'booking-result-item' },
        el('span', { class: 'label' }, 'Giá phòng/đêm'),
        el('span', { class: 'value' }, formatCurrency(booking.gia_mac_dinh))
      )
    )
  );

  if (booking.thoi_gian_check_in_thuc) {
    card.appendChild(el('div', { class: 'booking-result-note' },
      el('span', {}, `Đã nhận phòng lúc: ${formatDateTime(booking.thoi_gian_check_in_thuc)}`)
    ));
  }

  if (booking.services && booking.services.length > 0) {
    const serviceSection = el('div', { class: 'booking-result-section' },
      el('h4', {}, 'Dịch vụ đã sử dụng')
    );
    const serviceList = el('ul', { class: 'booking-service-list' });
    for (const svc of booking.services) {
      serviceList.appendChild(el('li', {},
        `${svc.ten_dich_vu || `Dịch vụ #${svc.dich_vu_id}`} × ${svc.so_luong} — ${formatCurrency(svc.thanh_tien)}`
      ));
    }
    serviceSection.appendChild(serviceList);
    card.appendChild(serviceSection);
  }

  if (booking.invoice) {
    const inv = booking.invoice;
    const invoiceSection = el('div', { class: 'booking-result-section' },
      el('h4', {}, `Hóa đơn #${inv.id}`),
      el('div', { class: 'booking-result-grid' },
        el('div', { class: 'booking-result-item' },
          el('span', { class: 'label' }, 'Tiền phòng'),
          el('span', { class: 'value' }, formatCurrency(inv.tong_tien_phong))
        ),
        el('div', { class: 'booking-result-item' },
          el('span', { class: 'label' }, 'Tiền dịch vụ'),
          el('span', { class: 'value' }, formatCurrency(inv.tong_tien_dich_vu))
        ),
        el('div', { class: 'booking-result-item' },
          el('span', { class: 'label' }, 'Thuế VAT'),
          el('span', { class: 'value' }, formatCurrency(inv.thue_vat))
        ),
        el('div', { class: 'booking-result-item' },
          el('span', { class: 'label' }, 'Tổng cộng'),
          el('span', { class: 'value booking-total' }, formatCurrency(inv.tong_cong))
        )
      )
    );
    card.appendChild(invoiceSection);
  }

  container.appendChild(card);
}
