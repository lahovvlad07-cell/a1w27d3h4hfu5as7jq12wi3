// ===== ПРЕВЬЮ АССОРТИМЕНТА (главная страница) =====
// Показывает те же товары, что и в кабинете, но упрощённо: без выбора
// количества и расчёта итога — это остаётся в личном кабинете. Задача
// этого блока — дать посмотреть на товар и ориентировочную цену ДО
// регистрации. Кнопка «Купить» просто открывает вход (data-open-auth
// подхватывается authModal.js), а не переходит к оплате.
import { CATALOG } from './data/catalog.js';
import { PRODUCT_ICONS } from './ui/catalogIcons.js';

function formatMoney(n) {
    const rounded = Math.round(n * 100) / 100;
    return rounded.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function priceFrom(item) {
    if (item.type === 'unit') {
        return `${formatMoney(item.pricePerUnit)} ${item.currency} / шт`;
    }
    return `от ${formatMoney(item.minAmount)} ${item.currency} · комиссия ${item.feePercent}%`;
}

function cardMarkup(item) {
    return `
        <article class="product-card${item.featured ? ' product-card--featured' : ''} reveal">
            <div class="product-head">
                <div class="product-icon">${PRODUCT_ICONS[item.icon] || ''}</div>
                <span class="badge badge-live">доступно</span>
            </div>
            <div class="product-body">
                <div class="product-name">${item.name}</div>
                <div class="product-desc">${item.description}</div>
            </div>
            <div class="product-foot">
                <span class="product-price">${priceFrom(item)}</span>
                <button type="button" class="btn-product" data-open-auth>Купить</button>
            </div>
        </article>
    `;
}

export function renderAssortmentPreview() {
    const grid = document.getElementById('assortmentGrid');
    if (!grid) return;
    grid.innerHTML = CATALOG.map(cardMarkup).join('');
}
