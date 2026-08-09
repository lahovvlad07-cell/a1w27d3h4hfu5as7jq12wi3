// ===== ОКНО ОФОРМЛЕНИЯ ПОКУПКИ =====
// Открывает страницу оплаты конкретного товара (ссылка приходит из
// каталога, см. data/catalog.js) во встроенном окне поверх сайта — без
// перехода на отдельную страницу.
//
// ЧЕСТНОЕ ПРЕДУПРЕЖДЕНИЕ (техническое, не для показа пользователю):
// некоторые платёжные страницы запрещают показывать себя во фрейме
// (заголовок X-Frame-Options / CSP) — это решает не наш код, а сам
// платёжный провайдер, и заранее не проверяется. Поэтому рядом всегда
// есть кнопка "Открыть в новой вкладке" — на случай, если конкретная
// страница оплаты встраивание не поддерживает.
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
    }

    function close() {
        modal.classList.add('hidden');
        overlay.classList.add('hidden');
        frame.src = 'about:blank'; // останавливаем загрузку/сессию оплаты в фоне
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    openNewTabBtn.addEventListener('click', () => {
        if (currentUrl) window.open(currentUrl, '_blank', 'noopener');
    });

    return { open, close };
}
