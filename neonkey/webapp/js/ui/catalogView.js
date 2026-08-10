// ===== КАТАЛОГ (вкладка «Каталог» в личном кабинете) =====
// Живёт только на account.html, куда вообще нельзя попасть без входа
// (см. account.js) — поэтому здесь больше не нужна отдельная блокировка
// «войдите, чтобы купить». Рисует карточки из data/catalog.js, считает
// цену по количеству/сумме прямо на карточке и открывает оплату.
//
// Кнопка «Купить» работает уже сейчас, даже пока checkoutUrl не заведён:
// если ссылка на оплату есть — открывается встроенное окно оплаты
// (checkoutModal), если нет — сайт честно ведёт в Telegram-бота с уже
// посчитанной суммой, чтобы заказ можно было принять вручную (см. README,
// раздел «Честная оговорка про историю заказов» — тот же принцип: это лог
// намерения купить, а не подтверждение оплаты).
import { CATALOG } from '../data/catalog.js';
import { PRODUCT_ICONS } from './catalogIcons.js';
import { BOT_USERNAME } from '../config.js';
import { showToast } from './toast.js';
import { addOrderToHistory } from '../lib/orders.js';

// Текущее выбранное количество/сумма по каждому товару — состояние сессии
// покупки конкретного посетителя, поэтому живёт здесь, а не в catalog.js.
const qtyState = {};

function defaultQty(item) {
    return item.type === 'unit' ? item.defaultQty : item.defaultAmount;
}
function minQty(item) {
    return item.type === 'unit' ? item.minQty : item.minAmount;
}
function maxQty(item) {
    return item.type === 'unit' ? item.maxQty : item.maxAmount;
}
function currentQty(item) {
    return qtyState[item.id] ?? defaultQty(item);
}
function computeTotal(item, qty) {
    if (item.type === 'unit') return qty * item.pricePerUnit;
    if (item.type === 'topup') return qty * (1 + item.feePercent / 100);
    return 0;
}
function formatMoney(n) {
    const rounded = Math.round(n * 100) / 100;
    return rounded.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}
function priceLine(item, qty) {
    const total = computeTotal(item, qty);
    if (item.type === 'unit') {
        return `${formatMoney(item.pricePerUnit)} ${item.currency} / шт · итого ${formatMoney(total)} ${item.currency}`;
    }
    return `комиссия ${item.feePercent}% · к оплате ${formatMoney(total)} ${item.currency}`;
}

function qtyMarkup(item) {
    const qty = currentQty(item);
    const suffix = item.type === 'unit' ? '⭐' : item.currency;
    return `
        <div class="product-qty">
            <button type="button" class="qty-btn" data-qty-action="dec" data-id="${item.id}" aria-label="Уменьшить">−</button>
            <span class="qty-value" data-qty-value="${item.id}">${qty}</span>
            <button type="button" class="qty-btn" data-qty-action="inc" data-id="${item.id}" aria-label="Увеличить">+</button>
            <span class="qty-suffix">${suffix}</span>
        </div>
    `;
}

function cardMarkup(item) {
    const sizeClass = item.featured ? ' product-card--featured' : '';
    const qty = currentQty(item);

    return `
        <article class="product-card${sizeClass} reveal">
            <div class="product-head">
                <div class="product-icon">${PRODUCT_ICONS[item.icon] || ''}</div>
                <span class="badge badge-live">доступно</span>
            </div>
            <div class="product-body">
                <div class="product-name">${item.name}</div>
                <div class="product-desc">${item.description}</div>
                ${qtyMarkup(item)}
                ${!item.checkoutUrl ? '<p class="product-note">Пока оформляется через Telegram-бота — прямая оплата на сайте появится следом.</p>' : ''}
            </div>
            <div class="product-foot">
                <span class="product-price" data-price-for="${item.id}">${priceLine(item, qty)}</span>
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

export function initCatalogButtons(checkoutModal) {
    const grid = document.getElementById('shopGrid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
        const qtyBtn = e.target.closest('.qty-btn');
        if (qtyBtn) {
            const item = CATALOG.find((p) => p.id === qtyBtn.dataset.id);
            if (!item) return;

            let qty = currentQty(item) + (qtyBtn.dataset.qtyAction === 'inc' ? item.step : -item.step);
            qty = Math.min(maxQty(item), Math.max(minQty(item), qty));
            qtyState[item.id] = qty;

            const valueEl = grid.querySelector(`[data-qty-value="${item.id}"]`);
            if (valueEl) valueEl.textContent = qty;
            const priceEl = grid.querySelector(`[data-price-for="${item.id}"]`);
            if (priceEl) priceEl.textContent = priceLine(item, qty);
            return;
        }

        const btn = e.target.closest('.buy-btn');
        if (!btn) return;

        const item = CATALOG.find((p) => p.id === btn.dataset.id);
        if (!item) return;

        const qty = currentQty(item);
        const total = computeTotal(item, qty);
        const priceLabel = `${formatMoney(total)} ${item.currency}`;

        if (item.checkoutUrl) {
            const url = new URL(item.checkoutUrl);
            url.searchParams.set(item.type === 'unit' ? 'qty' : 'amount', String(qty));
            url.searchParams.set('total', total.toFixed(2));
            checkoutModal.open(url.toString(), item.name);
        } else {
            const payload = `order_${item.id}_${qty}`;
            window.open(`https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(payload)}`, '_blank', 'noopener');
            showToast(`Открыли Telegram-бота — там завершите оплату (${priceLabel})`, 'info', 5000);
        }

        addOrderToHistory({ id: item.id, name: item.name, icon: item.historyIcon, price: priceLabel });
    });
}
