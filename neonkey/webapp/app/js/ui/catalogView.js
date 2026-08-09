// ===== КАТАЛОГ (страница "Магазин") =====
// Рисует карточки из data/catalog.js и открывает оплату товара через
// checkoutModal.js. Цену и любые скидки/промокоды считает платёжная
// система на своей странице оплаты, сюда просто передаётся готовая
// ссылка. Дополнительно каждый переход к оплате сохраняется в историю
// заказов профиля (см. lib/orders.js).
import { CATALOG } from '../data/catalog.js';
import { showToast } from './toast.js';
import { addOrderToHistory } from '../lib/orders.js';
import { renderProfile } from './profileView.js';

export function renderCatalog() {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;

    grid.innerHTML = CATALOG.map((item) => `
        <div class="product-card">
            <div class="product-icon-wrapper"><span class="product-icon">${item.icon}</span></div>
            <div class="product-info">
                <div class="product-name">${item.name}</div>
                <div class="product-description">${item.description}</div>
                <div class="product-price">${item.price}</div>
            </div>
            <button class="btn-product buy-btn" data-id="${item.id}">Купить</button>
        </div>
    `).join('');
}

export function initCatalogButtons(checkoutModal) {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;

    grid.addEventListener('click', async (e) => {
        const btn = e.target.closest('.buy-btn');
        if (!btn) return;

        const item = CATALOG.find((p) => p.id === btn.dataset.id);
        if (!item) return;

        if (!item.checkoutUrl) {
            showToast('🔜 Этот товар скоро появится', 'info');
            return;
        }

        checkoutModal.open(item.checkoutUrl, item.name);

        // Фиксируем заказ в истории профиля (последние 5) — не блокируем
        // открытие оплаты, если запись вдруг не удалась.
        addOrderToHistory(item).then(({ error } = {}) => {
            if (!error) renderProfile();
        });
    });
}
