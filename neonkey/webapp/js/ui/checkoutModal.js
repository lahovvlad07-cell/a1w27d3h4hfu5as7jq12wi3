// ===== ОКНО ОФОРМЛЕНИЯ ПОКУПКИ =====
// Открывает страницу оплаты конкретного товара (ссылка приходит из
// каталога, см. data/catalog.js) во встроенном окне поверх сайта.
//
// ТЕХНИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ: некоторые платёжные страницы запрещают
// показывать себя во фрейме (X-Frame-Options / CSP) — это решает не
// наш код, а сам платёжный провайдер. Поэтому рядом всегда есть кнопка
// «Открыть в новой вкладке».
export function initCheckoutModal() {
    const modal = document.getElementById('checkoutModal');
    const overlay = document.getElementById('checkoutModalOverlay');
    const frame = document.getElementById('checkoutFrame');
    const closeBtn = document.getElementById('checkoutModalClose');
    const openNewTabBtn = document.getElementById('checkoutOpenNewTab');
    const titleEl = document.getElementById('checkoutModalTitle');

    let currentUrl = '';

    function open(url, productName) {
        currentUrl = url;
        titleEl.textContent = productName || 'Оплата';
        frame.src = url;
        modal.classList.remove('hidden');
        overlay.classList.remove('hidden');
        requestAnimationFrame(() => {
            modal.classList.add('show');
            overlay.classList.add('show');
        });
    }

    function close() {
        modal.classList.remove('show');
        overlay.classList.remove('show');
        setTimeout(() => {
            modal.classList.add('hidden');
            overlay.classList.add('hidden');
            frame.src = 'about:blank';
        }, 300);
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    openNewTabBtn.addEventListener('click', () => {
        if (currentUrl) window.open(currentUrl, '_blank', 'noopener');
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) close();
    });

    return { open, close };
}
