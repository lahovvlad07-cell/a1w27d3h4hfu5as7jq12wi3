// ===== ТОСТ-УВЕДОМЛЕНИЯ =====
let hideTimer = null;

/**
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration мс, по умолчанию 2500
 */
export function showToast(message, type = 'success', duration = 2500) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const icon = { success: '✅', error: '⚠️', info: 'ℹ️' }[type] || '';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    toast.className = `toast ${type}`;

    // Небольшая задержка перед добавлением .show, чтобы сработал CSS-переход
    requestAnimationFrame(() => toast.classList.add('show'));

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 250);
    }, duration);
}
