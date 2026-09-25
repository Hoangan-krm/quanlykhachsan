import { api } from '../services/api.js';
import { el, clear } from '../utils/dom.js';
import { formatCurrency, formatDateTime, ROOM_STATUS, BOOKING_STATUS, badge } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';

export async function renderDashboard(container) {
  setPageTitle('Dashboard');
  const res = await api.get('/dashboard/stats');
  const d = res.data;

  clear(container);
  container.appendChild(el('div', { class: 'stat-grid' },
    statCard('🚪', 'Tổng phòng', d.rooms.total, 'var(--color-primary)', 'var(--color-primary-light)'),
    statCard('✅', 'Phòng trống', d.rooms.Trong || 0, 'var(--color-success)', 'var(--color-success-light)'),
    statCard('🔴', 'Đang ở', d.rooms.DangO || 0, 'var(--color-danger)', 'var(--color-danger-light)'),
    statCard('⚠️', 'Đã đặt', d.rooms.DaDat || 0, 'var(--color-warning)', 'var(--color-warning-light)'),
    statCard('🛠️', 'Bảo trì', d.rooms.BaoTri || 0, 'var(--color-text-muted)', 'var(--color-bg)'),
    statCard('🧹', 'Đang dọn', d.rooms.DangDon || 0, 'var(--color-info)', 'var(--color-info-light)'),
    statCard('💰', 'Doanh thu hôm nay', formatCurrency(d.today_revenue?.total || 0), 'var(--color-success)', 'var(--color-success-light)'),
    statCard('📅', 'Check-in hôm nay', d.today_arrivals?.length || 0, 'var(--color-info)', 'var(--color-info-light)'),
    statCard('🚪', 'Check-out hôm nay', d.today_departures?.length || 0, 'var(--color-warning)', 'var(--color-warning-light)')
  ));

  container.appendChild(el('div', { class: 'dashboard-grid' },
    el('div', { class: 'dashboard-card' },
      el('h3', {}, 'Check-in hôm nay'),
      renderArrivalList(d.today_arrivals || [])
    ),
    el('div', { class: 'dashboard-card' },
      el('h3', {}, 'Check-out hôm nay'),
      renderDepartureList(d.today_departures || [])
    )
  ));
}

function statCard(icon, label, value, color, bg) {
  return el('div', { class: 'stat-card' },
    el('div', { class: 'stat-icon', style: { background: bg, color } }, icon),
    el('div', { class: 'stat-info' },
      el('div', { class: 'stat-label' }, label),
      el('div', { class: 'stat-value' }, value)
    )
  );
}

function renderArrivalList(arrivals) {
  if (!arrivals.length) return el('p', { style: { color: 'var(--color-text-muted)' } }, 'Không có khách check-in hôm nay');
  return el('div', { class: 'dashboard-list' },
    ...arrivals.map(a => el('div', { class: 'dashboard-list-item' },
      el('span', {}, `#${a.id} - ${a.ten_khach || a.ho_ten || 'Khách'}`),
      el('span', {}, `Phòng ${a.so_phong || ''}`)
    ))
  );
}

function renderDepartureList(departures) {
  if (!departures.length) return el('p', { style: { color: 'var(--color-text-muted)' } }, 'Không có khách check-out hôm nay');
  return el('div', { class: 'dashboard-list' },
    ...departures.map(d => el('div', { class: 'dashboard-list-item' },
      el('span', {}, `#${d.id} - ${d.ten_khach || d.ho_ten || 'Khách'}`),
      el('span', {}, `Phòng ${d.so_phong || ''}`)
    ))
  );
}
