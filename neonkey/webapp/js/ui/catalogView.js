// ===== КАТАЛОГ (вкладка «Каталог» в личном кабинете) =====
// Живёт только на account.html, куда вообще нельзя попасть без входа
// (см. account.js) — поэтому здесь не нужна отдельная блокировка «войдите,
// чтобы купить». Карточка — это просто витрина: иконка, короткое описание
// и цена/комиссия. Выбор количества, разбивка цены и сама оплата — в
// модалке оформления покупки (см. ui/buyModal.js), которая открывается по
// кнопке «Купить».
import { CATALOG } from '../data/catalog.js';
import { PRODUCT_ICONS } from './catalogIcons.js';

function formatMoney(n) {
    const rounded = Math.round(n * 100) / 100;
    return rounded.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function priceLine(item) {
    if (item.type === 'unit') return `${formatMoney(item.pricePerUnit)} ${item.currency} / звезда`;
    return `комиссия ${item.feePercent}%`;
}

function cardMarkup(item) {
    const sizeClass = item.featured ? ' product-card--featured' : '';
    return `
        <article class="product-card${sizeClass} reveal">
            <div class="product-head">
                <div class="product-icon">${PRODUCT_ICONS[item.icon] || ''}</div>
                <span class="badge badge-live">доступно</span>
            </div>
            <div class="product-body">
                <div class="product-name">${item.name}</div>
                <div class="product-desc">${item.description}</div>
            </div>
            <div class="product-foot">
                <span class="product-price">${priceLine(item)}</span>
                <button class="btn-product buy-btn" data-id="${item.id}">Купить</button>
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

export function initCatalogButtons(buyModal) {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
        const btn = e.target.closest('.buy-btn');
        if (!btn) return;
        const item = CATALOG.find((p) => p.id === btn.dataset.id);
        if (!item) return;
        buyModal.open(item);
    });
}
