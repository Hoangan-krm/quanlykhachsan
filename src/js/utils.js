// === UTILITIES ===

const updateNav = (target) => {
    const links = document.querySelectorAll('#main-nav-links .nav-link');
    links.forEach(link => {
        if(link.getAttribute('data-target') === target) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
};

const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};
const parseDate = (iso) => new Date(iso).toLocaleDateString('vi-VN');
const parseDateTime = (iso) => new Date(iso).toLocaleString('vi-VN');
const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-root');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle text-green-500';
    if (type === 'error') icon = 'fa-exclamation-circle text-red-500';
    if (type === 'warning') icon = 'fa-exclamation-triangle text-yellow-500';
    
    toast.innerHTML = `<i class="fas ${icon} text-xl"></i> <div>${message}</div>`;
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

const openModal = (id, content) => {
    const root = document.getElementById('modals-root');
    const modalHtml = `
        <div class="modal-overlay" id="modal-${id}" onclick="if(event.target === this) closeModal('${id}')">
            <div class="modal-content p-6">
                ${content}
            </div>
        </div>
    `;
    root.insertAdjacentHTML('beforeend', modalHtml);
    setTimeout(() => {
        document.getElementById(`modal-${id}`).classList.add('active');
    }, 10);
};

const closeModal = (id) => {
    const modal = document.getElementById(`modal-${id}`);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
    }
};
