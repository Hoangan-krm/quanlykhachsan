import { api } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { renderTable, renderPagination } from '../components/ui.js';

export async function renderReports(container) {
  setPageTitle('Báo cáo');
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  let fromDate = monthAgo;
  let toDate = today;
  let reportTab = 'revenue';
  let currentPage = 1;

  async function load() {
    showLoading(container);
    clear(container);
    container.appendChild(buildToolbar());
    if (reportTab === 'revenue') await loadRevenue();
    else if (reportTab === 'occupancy') await loadOccupancy();
    else if (reportTab === 'shifts') await loadShiftReport();
    else if (reportTab === 'history') await loadHistory();
  }

  function buildToolbar() {
    return el('div', { class: 'toolbar', style: { flexWrap: 'wrap', gap: '12px' } },
      el('div', { class: 'search-box' },
        el('span', {}, '📅'),
        el('label', { style: { fontSize: '13px', marginRight: '4px' } }, 'Từ:'),
        el('input', { type: 'date', value: fromDate, style: { padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }, onchange: (e) => { fromDate = e.target.value; load(); } }),
        el('label', { style: { fontSize: '13px', margin: '0 4px 0 8px' } }, 'Đến:'),
        el('input', { type: 'date', value: toDate, style: { padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)' }, onchange: (e) => { toDate = e.target.value; load(); } }),
      ),
      el('div', { class: 'search-box' },
        el('select', { class: 'filter-select', onchange: (e) => { reportTab = e.target.value; currentPage = 1; load(); } },
          el('option', { value: 'revenue', selected: reportTab === 'revenue' }, 'Doanh thu'),
          el('option', { value: 'occupancy', selected: reportTab === 'occupancy' }, 'Tỷ lệ lấp đầy'),
          el('option', { value: 'shifts', selected: reportTab === 'shifts' }, 'Ca làm việc'),
          el('option', { value: 'history', selected: reportTab === 'history' }, 'Lịch sử hoạt động'),
        ),
      ),
    );
  }

  async function loadRevenue() {
    try {
      const res = await api.get(`/reports/revenue?from=${fromDate}&to=${toDate}`);
      const rev = res.data || [];
      const totalRevenue = rev.reduce((sum, r) => sum + Number(r.total || r.tong_tien || 0), 0);
      const content = el('div', { class: 'report-content' });
      content.appendChild(el('div', { class: 'stat-grid' },
        statCard('💰', 'Tổng doanh thu', formatCurrency(totalRevenue), 'var(--color-success)', 'var(--color-success-light)'),
        statCard('📊', 'Số ngày', rev.length, 'var(--color-primary)', 'var(--color-primary-light)'),
        statCard('📈', 'Trung bình/ngày', formatCurrency(rev.length ? totalRevenue / rev.length : 0), 'var(--color-info)', 'var(--color-info-light)'),
      ));
      if (rev.length > 0) {
        content.appendChild(el('div', { class: 'card', style: { marginBottom: '16px' } },
          el('div', { class: 'card-header' }, el('h3', { class: 'card-title' }, 'Biểu đồ doanh thu')),
          renderBarChart(rev.map(r => ({ label: formatDate(r.date || r.ngay), value: Number(r.total || r.tong_tien || 0) }))),
        ));
        const tableDiv = el('div');
        renderTable(tableDiv, {
          columns: [
            { label: 'Ngày', render: r => formatDate(r.date || r.ngay) },
            { label: 'Doanh thu', render: r => formatCurrency(r.total || r.tong_tien || 0) },
          ],
          rows: rev,
        });
        content.appendChild(el('div', { class: 'card' }, el('div', { class: 'card-header' }, el('h3', { class: 'card-title' }, 'Chi tiết doanh thu')), tableDiv));
      } else {
        content.appendChild(emptyState('Không có dữ liệu doanh thu trong khoảng thời gian này'));
      }
      container.appendChild(content);
    } catch (err) {
      container.appendChild(errorState(err.message));
    }
  }

  async function loadOccupancy() {
    try {
      const res = await api.get(`/reports/occupancy?from=${fromDate}&to=${toDate}`);
      const occ = res.data || {};
      const content = el('div', { class: 'report-content' });
      content.appendChild(el('div', { class: 'stat-grid' },
        statCard('📊', 'Tỷ lệ lấp đầy', `${occ.rate || 0}%`, 'var(--color-primary)', 'var(--color-primary-light)'),
        statCard('🛏️', 'Số đêm đã đặt', occ.nights_booked || 0, 'var(--color-success)', 'var(--color-success-light)'),
        statCard('🏨', 'Số đêm có sẵn', occ.available_nights || 0, 'var(--color-info)', 'var(--color-info-light)'),
      ));
      if (occ.room_ranking?.length > 0) {
        const tableDiv = el('div');
        renderTable(tableDiv, {
          columns: [
            { label: 'Hạng', key: 'rank' },
            { label: 'Phòng', key: 'so_phong' },
            { label: 'Loại', key: 'ten_loai_phong' },
            { label: 'Số lần đặt', key: 'booking_count' },
          ],
          rows: occ.room_ranking.map((r, i) => ({ ...r, rank: i + 1 })),
        });
        content.appendChild(el('div', { class: 'card' }, el('div', { class: 'card-header' }, el('h3', { class: 'card-title' }, 'Xếp hạng phòng')), tableDiv));
      } else {
        content.appendChild(emptyState('Không có dữ liệu lấp đầy trong khoảng thời gian này'));
      }
      container.appendChild(content);
    } catch (err) {
      container.appendChild(errorState(err.message));
    }
  }

  async function loadShiftReport() {
    try {
      const res = await api.get(`/reports/shifts?from=${fromDate}&to=${toDate}`);
      const shifts = res.data || [];
      const content = el('div', { class: 'report-content' });
      const totalRevenue = shifts.reduce((s, r) => s + Number(r.tong_thu || 0), 0);
      const totalDiff = shifts.reduce((s, r) => s + Number(r.chenh_lech || 0), 0);
      content.appendChild(el('div', { class: 'stat-grid' },
        statCard('🕐', 'Số ca', shifts.length, 'var(--color-primary)', 'var(--color-primary-light)'),
        statCard('💰', 'Tổng thu', formatCurrency(totalRevenue), 'var(--color-success)', 'var(--color-success-light)'),
        statCard('⚠️', 'Tổng chênh lệch', formatCurrency(totalDiff), totalDiff === 0 ? 'var(--color-success)' : 'var(--color-warning)', 'var(--color-warning-light)'),
      ));
      if (shifts.length > 0) {
        const tableDiv = el('div');
        renderTable(tableDiv, {
          columns: [
            { label: 'Nhân viên', render: r => r.ten_nhan_vien || r.ho_ten || '-' },
            { label: 'Mở ca', render: r => formatDateTime(r.gio_mo_ca) },
            { label: 'Đóng ca', render: r => r.gio_dong_ca ? formatDateTime(r.gio_dong_ca) : '-' },
            { label: 'Tiền đầu ca', render: r => formatCurrency(r.tien_mat_dau_ca) },
            { label: 'Tiền cuối ca', render: r => r.tien_mat_cuoi_ca != null ? formatCurrency(r.tien_mat_cuoi_ca) : '-' },
            { label: 'Tổng thu', render: r => formatCurrency(r.tong_thu || 0) },
            { label: 'Chênh lệch', render: r => { const v = Number(r.chenh_lech || 0); return el('span', { class: `badge ${v === 0 ? 'badge-success' : 'badge-warning'}` }, formatCurrency(v)); } },
          ],
          rows: shifts,
        });
        content.appendChild(el('div', { class: 'card' }, el('div', { class: 'card-header' }, el('h3', { class: 'card-title' }, 'Báo cáo ca làm việc')), tableDiv));
      } else {
        content.appendChild(emptyState('Không có ca làm việc trong khoảng thời gian này'));
      }
      container.appendChild(content);
    } catch (err) {
      container.appendChild(errorState(err.message));
    }
  }

  async function loadHistory() {
    try {
      const res = await api.get(`/reports/history?from=${fromDate}&to=${toDate}&page=${currentPage}&limit=20`);
      const history = res.data || [];
      const content = el('div', { class: 'report-content' });
      if (history.length > 0) {
        const tableDiv = el('div');
        renderTable(tableDiv, {
          columns: [
            { label: 'Thời gian', render: r => formatDateTime(r.thoi_gian || r.created_at) },
            { label: 'Người dùng', key: 'nguoi_dung' },
            { label: 'Hành động', render: r => el('span', { class: 'badge badge-info' }, r.hanh_dong) },
            { label: 'Chi tiết', render: r => r.chi_tiet || '-' },
          ],
          rows: history,
        });
        content.appendChild(el('div', { class: 'card' }, el('div', { class: 'card-header' }, el('h3', { class: 'card-title' }, 'Lịch sử hoạt động')), tableDiv));
        const pagination = el('div', { class: 'pagination' });
        renderPagination(pagination, { page: res.page, totalPages: res.totalPages, total: res.total, limit: res.limit, onPage: (p) => { currentPage = p; loadHistory(); } });
        content.appendChild(pagination);
      } else {
        content.appendChild(emptyState('Không có hoạt động trong khoảng thời gian này'));
      }
      container.appendChild(content);
    } catch (err) {
      container.appendChild(errorState(err.message));
    }
  }

  function renderBarChart(items) {
    if (!items.length) return el('div', { class: 'empty-state' }, 'Không có dữ liệu');
    const maxVal = Math.max(...items.map(i => i.value), 1);
    return el('div', { class: 'bar-chart', style: { display: 'flex', alignItems: 'flex-end', gap: '4px', height: '200px', padding: '16px', overflowX: 'auto', borderBottom: '1px solid var(--color-border)' } },
      ...items.map(item => {
        const heightPct = (item.value / maxVal) * 100;
        return el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px', flex: '1' } },
          el('div', { title: formatCurrency(item.value), style: { width: '100%', height: `${heightPct}%`, minHeight: '2px', background: 'var(--color-primary)', borderRadius: '4px 4px 0 0', transition: 'height 0.3s' } }),
          el('div', { style: { fontSize: '10px', marginTop: '4px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' } }, item.label),
        );
      }),
    );
  }

  function emptyState(msg) {
    return el('div', { class: 'empty-state', style: { padding: '40px', textAlign: 'center' } }, el('p', { style: { color: 'var(--color-text-muted)' } }, msg));
  }

  function errorState(msg) {
    return el('div', { class: 'error-state' }, el('p', {}, msg));
  }

  await load();
}

function statCard(icon, label, value, color, bg) {
  return el('div', { class: 'stat-card' },
    el('div', { class: 'stat-icon', style: { background: bg, color } }, icon),
    el('div', { class: 'stat-info' }, el('div', { class: 'stat-label' }, label), el('div', { class: 'stat-value' }, value))
  );
}
