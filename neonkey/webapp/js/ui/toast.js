// ===== ТОСТ-УВЕДОМЛЕНИЯ =====
let hideTimer = null;

/**
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration мс, по умолчанию 3200
 */
export function showToast(message, type = 'success', duration = 3200) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const icon = { success: '✅', error: '⚠️', info: 'ℹ️' }[type] || '';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    toast.className = `toast ${type}`;

    requestAnimationFrame(() => toast.classList.add('show'));

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}
