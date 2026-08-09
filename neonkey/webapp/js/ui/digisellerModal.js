// ===== ОКНО ОПЛАТЫ DIGISELLER =====
// Открывает страницу оплаты конкретного товара (ссылка приходит из
// каталога, см. data/catalog.js) во встроенном окне поверх сайта — без
// перехода на отдельную страницу, как и просили ("без редиректа").
//
// ЧЕСТНОЕ ПРЕДУПРЕЖДЕНИЕ: некоторые платёжные страницы (в том числе
// иногда сама Digiseller, в зависимости от способа оплаты) запрещают
// показывать себя во фрейме (заголовок X-Frame-Options / CSP) — это
// решает не наш код, а сам Digiseller/платёжный провайдер, и заранее
// не проверяется. Поэтому рядом всегда есть кнопка "Открыть в новой
// вкладке" — на случай, если конкретная страница оплаты встраивание
// не поддерживает.
export function initDigisellerModal() {
    const modal = document.getElementById('digisellerModal');
    const overlay = document.getElementById('digisellerModalOverlay');
    const frame = document.getElementById('digisellerFrame');
    const closeBtn = document.getElementById('digisellerModalClose');
    const openNewTabBtn = document.getElementById('digisellerOpenNewTab');
    const titleEl = document.getElementById('digisellerModalTitle');

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
