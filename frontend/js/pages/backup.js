import { api, downloadBlob } from '../services/api.js';
import { el, clear, showLoading } from '../utils/dom.js';
import { formatDateTime } from '../utils/format.js';
import { setPageTitle } from '../components/layout.js';
import { toast, confirmDialog, buildForm, renderTable, openModal, closeModal } from '../components/ui.js';

export async function renderBackup(container) {
  setPageTitle('Sao lưu & Khôi phục');

  async function load() {
    showLoading(container);
    try {
      const res = await api.get('/backup');
      const data = res.data || {};
      const files = data.files || [];
      const logs = data.logs || [];
      clear(container);

      const toolbar = el('div', { class: 'toolbar' },
        el('button', { class: 'btn btn-primary', onclick: () => createBackup() }, '📦 Tạo backup'),
      );
      container.appendChild(toolbar);

      container.appendChild(el('div', { class: 'card', style: { marginBottom: '16px' } },
        el('div', { class: 'card-header' }, el('h3', { class: 'card-title' }, 'File backup')),
        files.length > 0 ? (() => {
          const tableDiv = el('div');
          renderTable(tableDiv, {
            columns: [
              { label: 'Tên file', key: 'filename' },
              { label: 'Kích thước', render: r => formatFileSize(r.size) },
              { label: 'Thời gian', render: r => formatDateTime(r.created_at || r.mtime) },
            ],
            rows: files,
            actions: (row) => [
              el('button', { class: 'btn btn-danger btn-sm', onclick: () => restoreBackup(row) }, 'Khôi phục'),
            ],
          });
          return tableDiv;
        })() : el('div', { class: 'empty-state', style: { padding: '20px', textAlign: 'center' } }, el('p', { style: { color: 'var(--color-text-muted)' } }, 'Chưa có file backup nào')),
      ));

      if (logs.length > 0) {
        const logTableDiv = el('div');
        renderTable(logTableDiv, {
          columns: [
            { label: 'Thời gian', render: r => formatDateTime(r.thoi_gian) },
            { label: 'Người thực hiện', key: 'nguoi_dung' },
            { label: 'Hành động', render: r => el('span', { class: 'badge badge-info' }, r.hanh_dong) },
            { label: 'Chi tiết', key: 'chi_tiet' },
          ],
          rows: logs,
        });
        container.appendChild(el('div', { class: 'card' },
          el('div', { class: 'card-header' }, el('h3', { class: 'card-title' }, 'Lịch sử backup')),
          logTableDiv,
        ));
      }
    } catch (err) {
      clear(container);
      container.appendChild(el('div', { class: 'error-state' }, el('p', {}, err.message)));
    }
  }

  async function createBackup() {
    try {
      const res = await api.post('/backup', {});
      toast(`Backup thành công: ${res.data.filename || ''}`, 'success');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  function restoreBackup(file) {
    confirmDialog(`Khôi phục từ file "${file.filename}"? Dữ liệu hiện tại sẽ bị thay thế.`, async () => {
      try {
        await api.post('/backup/restore', { filename: file.filename });
        toast('Khôi phục thành công', 'success');
        load();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  await load();
}

function formatFileSize(bytes) {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}
