// ===== ПОДТВЕРЖДЕНИЕ ДЕЙСТВИЙ В АДМИНКЕ =====
// Раньше здесь использовался tg.showPopup() — нативный попап Telegram.
// В Telegram Web (web.telegram.org) этот метод поддерживается
// нестабильно: клик по кнопке ничего не показывает, а колбэк не
// вызывается — из-за этого "Выполнить"/"Отклонить" выглядели как
// нерабочие. Обычное HTML-окно в стиле остального приложения работает
// везде одинаково, поэтому подтверждение теперь полностью своё.
let resolveCurrent = null;

export function initAdminConfirm() {
    document.getElementById('adminConfirmYes').addEventListener('click', () => finish(true));
    document.getElementById('adminConfirmNo').addEventListener('click', () => finish(false));
    document.getElementById('adminConfirmModalOverlay').addEventListener('click', () => finish(false));
}

export function confirmAdminAction(message) {
    document.getElementById('adminConfirmText').textContent = message;
    document.getElementById('adminConfirmModal').classList.remove('hidden');
    document.getElementById('adminConfirmModalOverlay').classList.remove('hidden');
    return new Promise((resolve) => {
        resolveCurrent = resolve;
    });
}

function finish(result) {
    document.getElementById('adminConfirmModal').classList.add('hidden');
    document.getElementById('adminConfirmModalOverlay').classList.add('hidden');
    if (resolveCurrent) {
        resolveCurrent(result);
        resolveCurrent = null;
    }
}
