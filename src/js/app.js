// === MAIN INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    // Cổng quản trị (legacy) đã chuyển về /portal — URL cũ ?view=admin vẫn hợp lệ.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('view') === 'admin') {
        window.location.replace('/portal/');
        return;
    }

    // Link xác thực email từ email đăng ký: /#/verify-account?token=...
    const hash = window.location.hash || '';
    if (hash.startsWith('#/verify-account')) {
        const token = new URLSearchParams(hash.split('?')[1] || '').get('token') || '';
        renderVerifyView(token);
        return;
    }

    renderCustomerApp();
});
