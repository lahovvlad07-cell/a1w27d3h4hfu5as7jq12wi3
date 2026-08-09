// ===== КАТАЛОГ (страница "Магазин") =====
// Рисует карточки из data/catalog.js и открывает оплату товара через
// digisellerModal.js. Больше нет ни минималок, ни курсов, ни расчёта
// цены на клиенте — цену и любые скидки/промокоды считает сам Digiseller
// на своей странице оплаты, сюда просто передаётся готовая ссылка.
import { CATALOG } from '../data/catalog.js';
import { showToast } from './toast.js';

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

export function initCatalogButtons(digisellerModal) {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.buy-btn');
        if (!btn) return;

        const item = CATALOG.find((p) => p.id === btn.dataset.id);
        if (!item) return;

        if (!item.digisellerUrl) {
            showToast('🔜 Этот товар скоро появится', 'info');
            return;
        }

        digisellerModal.open(item.digisellerUrl, item.name);
    });
}
