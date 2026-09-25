import { el, clear } from './dom.js';

export function showLoading(container, message = 'Đang tải...') {
  if (!container) return;
  clear(container);
  container.appendChild(el('div', { class: 'ui-state-loading' },
    el('div', { class: 'spinner' }),
    el('p', { class: 'ui-state-message' }, message)
  ));
}

export function showError(container, message = 'Đã xảy ra lỗi', retryFn = null) {
  if (!container) return;
  clear(container);
  const state = el('div', { class: 'ui-state-error' },
    el('div', { class: 'ui-state-icon' }, '⚠️'),
    el('p', { class: 'ui-state-message' }, message)
  );
  if (typeof retryFn === 'function') {
    state.appendChild(el('button', { class: 'btn btn-primary ui-state-retry', onclick: () => retryFn() }, 'Thử lại'));
  }
  container.appendChild(state);
}

export function showEmpty(container, message = 'Không có dữ liệu') {
  if (!container) return;
  clear(container);
  container.appendChild(el('div', { class: 'ui-state-empty' },
    el('div', { class: 'ui-state-icon' }, '📭'),
    el('p', { class: 'ui-state-message' }, message)
  ));
}

export function clearState(container) {
  if (!container) return;
  clear(container);
}

export async function render(container, fetchFn, options = {}) {
  const {
    loadingMessage = 'Đang tải...',
    emptyMessage = 'Không có dữ liệu',
    errorMessage = 'Đã xảy ra lỗi',
    onSuccess = null,
  } = options;

  if (!container) return null;
  showLoading(container, loadingMessage);

  try {
    const data = await fetchFn();
    clearState(container);
    if (data == null || (Array.isArray(data) && data.length === 0)) {
      showEmpty(container, emptyMessage);
      return data;
    }
    if (typeof onSuccess === 'function') {
      onSuccess(container, data);
    }
    return data;
  } catch (err) {
    showError(container, err?.message || errorMessage, () => render(container, fetchFn, options));
    throw err;
  }
}
