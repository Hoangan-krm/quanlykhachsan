import { el, clear } from '../utils/dom.js';

const toastContainer = () => document.getElementById('toast-container');

export function toast(message, type = 'info', duration = 3000) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const t = el('div', { class: `toast toast-${type}` },
    el('span', {}, icons[type] || icons.info),
    el('span', { class: 'toast-message' }, message),
    el('button', { class: 'toast-close', onclick: () => t.remove() }, '×')
  );
  toastContainer().appendChild(t);
  if (duration > 0) setTimeout(() => t.remove(), duration);
}

export function confirmDialog(message, onConfirm, onCancel) {
  const container = document.getElementById('modal-container');
  clear(container);
  const modal = el('div', { class: 'modal-overlay' },
    el('div', { class: 'modal', style: { maxWidth: '400px' } },
      el('div', { class: 'modal-body' },
        el('div', { class: 'confirm-dialog' },
          el('div', { class: 'icon' }, '⚠️'),
          el('p', { style: { fontSize: '18px', marginBottom: '16px' } }, message)
        )
      ),
      el('div', { class: 'modal-footer' },
        el('button', { class: 'btn btn-secondary', onclick: () => { container.innerHTML = ''; onCancel?.(); } }, 'Hủy'),
        el('button', { class: 'btn btn-danger', onclick: () => { container.innerHTML = ''; onConfirm?.(); } }, 'Xác nhận')
      )
    )
  );
  modal.addEventListener('click', (e) => { if (e.target === modal) { container.innerHTML = ''; onCancel?.(); } });
  container.appendChild(modal);
}

export function openModal(title, bodyContent, options = {}) {
  const container = document.getElementById('modal-container');
  clear(container);
  const modalClass = options.large ? 'modal modal-large' : 'modal';
  const modal = el('div', { class: 'modal-overlay' },
    el('div', { class: modalClass },
      el('div', { class: 'modal-header' },
        el('h2', { class: 'modal-title' }, title),
        el('button', { class: 'modal-close', type: 'button', onclick: () => closeModal() }, '×')
      ),
      el('div', { class: 'modal-body' }, bodyContent),
      options.footer ? el('div', { class: 'modal-footer' }, options.footer) : null
    )
  );
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  container.appendChild(modal);
  return modal;
}

export function closeModal() {
  document.getElementById('modal-container').innerHTML = '';
}

export function buildForm(fields, onSubmit, submitLabel = 'Lưu') {
  const form = el('form', { class: 'form' });
  const inputs = {};
  for (const f of fields) {
    const group = el('div', { class: 'form-group' });
    group.appendChild(el('label', { class: 'form-label' }, f.label, f.required ? el('span', { class: 'required' }, ' *') : null));
    let input;
    if (f.type === 'select') {
      input = el('select', { class: 'form-select', name: f.name });
      for (const opt of f.options) {
        input.appendChild(el('option', { value: opt.value }, opt.label));
      }
    } else if (f.type === 'textarea') {
      input = el('textarea', { class: 'form-textarea', name: f.name, rows: f.rows || 3 });
    } else {
      input = el('input', { class: 'form-input', type: f.type || 'text', name: f.name, placeholder: f.placeholder || '' });
    }
    if (f.value != null) input.value = f.value;
    if (f.step) input.step = f.step;
    if (f.min != null) input.min = f.min;
    if (f.max != null) input.max = f.max;
    group.appendChild(input);
    if (f.hint) group.appendChild(el('div', { class: 'form-hint' }, f.hint));
    const errEl = el('div', { class: 'form-error', style: { display: 'none' } });
    group.appendChild(errEl);
    form.appendChild(group);
    inputs[f.name] = { input, errEl };
  }
  const submitBtn = el('button', { class: 'btn btn-primary', type: 'submit' }, submitLabel);
  form.appendChild(submitBtn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang lưu...';
    const data = {};
    for (const [name, { input }] of Object.entries(inputs)) {
      data[name] = input.value;
    }
    try {
      await onSubmit(data, inputs);
    } catch (err) {
      if (err.details?.field && inputs[err.details.field]) {
        inputs[err.details.field].errEl.textContent = err.details.message || err.message;
        inputs[err.details.field].errEl.style.display = 'block';
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  });
  return { form, inputs };
}

export function renderPagination(container, { page, totalPages, total, limit, onPage }) {
  clear(container);
  if (total === 0) return;
  const info = el('div', { class: 'pagination-info' }, `Hiển thị ${(page - 1) * limit + 1}-${Math.min(page * limit, total)} / ${total} mục`);
  const buttons = el('div', { class: 'pagination-buttons' });
  const prev = el('button', { class: 'btn btn-secondary btn-sm', disabled: page <= 1, onclick: () => onPage(page - 1) }, '← Trước');
  const next = el('button', { class: 'btn btn-secondary btn-sm', disabled: page >= totalPages, onclick: () => onPage(page + 1) }, 'Sau →');
  buttons.append(prev, el('span', { style: { padding: '0 8px', fontSize: '14px' } }, `${page}/${totalPages}`), next);
  container.append(info, buttons);
}

export function renderTable(container, { columns, rows, actions }) {
  const wrapper = el('div', { class: 'table-wrapper' });
  const scroll = el('div', { class: 'table-scroll' });
  const table = el('table', { class: 'data-table' });
  const thead = el('tr', {}, ...columns.map(c => el('th', {}, c.label)));
  table.appendChild(thead);
  if (rows.length === 0) {
    wrapper.appendChild(scroll);
    scroll.appendChild(table);
    container.innerHTML = '';
    container.appendChild(wrapper);
    import('../utils/dom.js').then(({ showEmpty }) => showEmpty(container, 'Không có dữ liệu'));
    return;
  }
  for (const row of rows) {
    const tr = el('tr', {});
    for (const col of columns) {
      const val = typeof col.render === 'function' ? col.render(row) : (row[col.key] ?? '-');
      tr.appendChild(el('td', {}, ...(Array.isArray(val) ? val : [val])));
    }
    if (actions) {
      const td = el('td', { class: 'actions' });
      const acts = typeof actions === 'function' ? actions(row) : actions;
      for (const act of acts) { if (act) td.appendChild(act); }
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  scroll.appendChild(table);
  wrapper.appendChild(scroll);
  container.innerHTML = '';
  container.appendChild(wrapper);
}
