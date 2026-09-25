export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

export function showLoading(container, msg = 'Đang tải...') {
  clear(container);
  container.appendChild(el('div', { class: 'loading-state' },
    el('div', { class: 'spinner' }), el('p', {}, msg)
  ));
}

export function showEmpty(container, msg = 'Không có dữ liệu') {
  clear(container);
  container.appendChild(el('div', { class: 'empty-state' },
    el('div', { class: 'icon' }, '📭'), el('p', {}, msg)
  ));
}

export function showError(container, msg = 'Đã xảy ra lỗi') {
  clear(container);
  container.appendChild(el('div', { class: 'error-state' },
    el('div', { class: 'icon' }, '⚠️'), el('p', {}, msg)
  ));
}

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
