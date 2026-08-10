// ===== КАТАЛОГ (секция на главной) =====
// Рисует карточки из data/catalog.js в виде "ключ-карт" (bento-сетка,
// первый featured-товар — крупнее) и открывает оплату через
// checkoutModal.js. Цену и скидки считает платёжная система на своей
// странице — сюда просто передаётся готовая ссылка.
import { CATALOG } from '../data/catalog.js';
import { showToast } from './toast.js';
import { addOrderToHistory } from '../lib/orders.js';

function cardMarkup(item) {
    const sizeClass = item.featured ? ' product-card--featured' : '';
    const priceOrSoon = item.checkoutUrl
        ? `<button class="btn-product buy-btn" data-id="${item.id}">Купить</button>`
        : `<button class="btn-product buy-btn" data-id="${item.id}" disabled>Скоро</button>`;

    return `
        <article class="product-card${sizeClass} reveal">
            <div class="product-head">
                <div class="product-icon">${item.icon}</div>
                ${item.checkoutUrl ? '<span class="badge badge-live">доступно</span>' : '<span class="badge badge-soon">скоро</span>'}
            </div>
            <div class="product-body">
                <div class="product-name">${item.name}</div>
                <div class="product-desc">${item.description}</div>
            </div>
            <div class="product-foot">
                <span class="product-price">${item.price}</span>
                ${priceOrSoon}
            </div>
        </article>
    `;
}

function ghostCardMarkup() {
    return `
        <article class="product-card product-card--soon reveal">
            <div class="product-head">
                <div class="product-icon">✨</div>
                <span class="badge">в разработке</span>
            </div>
            <div class="product-body">
                <div class="product-name">Новые товары</div>
                <div class="product-desc">Каталог пополняется — следующие позиции появятся здесь автоматически.</div>
            </div>
        </article>
    `;
}

export function renderCatalog() {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;
    grid.innerHTML = CATALOG.map(cardMarkup).join('') + ghostCardMarkup();
}

export function initCatalogButtons(checkoutModal) {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.buy-btn');
        if (!btn) return;

        const item = CATALOG.find((p) => p.id === btn.dataset.id);
        if (!item) return;

        if (!item.checkoutUrl) {
            showToast('Этот товар скоро появится', 'info');
            return;
        }

        checkoutModal.open(item.checkoutUrl, item.name);
        addOrderToHistory(item);
    });
}
