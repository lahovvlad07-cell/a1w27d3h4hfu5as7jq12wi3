// ===== МОДАЛКА ОФОРМЛЕНИЯ ПОКУПКИ =====
// Открывается по кнопке «Купить» в каталоге (см. ui/catalogView.js). Даёт
// выбрать количество/сумму, показывает разбивку цены и итог.
//
// Сама оплата — ШАБЛОН, не реальная интеграция:
//   - если у товара уже указан checkoutUrl (см. data/catalog.js) — модалка
//     передаёт эстафету дальше, во встроенное окно оплаты (checkoutModal),
//     это уже реальный переход на страницу платёжной системы;
//   - если checkoutUrl ещё нет (сейчас так у обоих товаров) — показывается
//     блок «Способ оплаты» с чипами и кнопка «Оплатить», но по нажатию
//     ничего не списывается — просто сохраняется заказ (как и раньше, это
//     лог намерения купить, см. README → «Честная оговорка про историю
//     заказов»). Когда появится реальный платёжный провайдер, замени
//     обработчик confirmBtn на настоящий вызов оплаты — вёрстка и разбивка
//     цены уже готовы, менять надо только сам платёж.
import { PRODUCT_ICONS } from './catalogIcons.js';
import { addOrderToHistory } from '../lib/orders.js';
import { showToast } from './toast.js';

function formatMoney(n) {
    const rounded = Math.round(n * 100) / 100;
    return rounded.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}
function minQty(item) { return item.type === 'unit' ? item.minQty : item.minAmount; }
function maxQty(item) { return item.type === 'unit' ? item.maxQty : item.maxAmount; }
function computeTotal(item, qty) {
    if (item.type === 'unit') return qty * item.pricePerUnit;
    if (item.type === 'topup') return qty * (1 + item.feePercent / 100);
    return 0;
}

export function initBuyModal({ checkoutModal } = {}) {
    const overlay = document.getElementById('buyModalOverlay');
    const modal = document.getElementById('buyModal');
    const closeBtn = document.getElementById('buyModalClose');
    const titleEl = document.getElementById('buyModalTitle');
    const iconEl = document.getElementById('buyModalIcon');
    const descEl = document.getElementById('buyModalDesc');
    const qtyLabelEl = document.getElementById('buyQtyLabel');
    const qtyValueEl = document.getElementById('buyQtyValue');
    const qtySuffixEl = document.getElementById('buyQtySuffix');
    const qtyDecBtn = document.getElementById('buyQtyDec');
    const qtyIncBtn = document.getElementById('buyQtyInc');
    const breakdownEl = document.getElementById('buyBreakdown');
    const methodsEl = document.getElementById('buyMethods');
    const confirmBtn = document.getElementById('buyConfirmBtn');

    let currentItem = null;
    let qty = 0;
    let method = 'card';

    function renderBreakdown() {
        qtyValueEl.textContent = qty;
        const total = computeTotal(currentItem, qty);

        if (currentItem.type === 'unit') {
            breakdownEl.innerHTML = `
                <div class="buy-row"><span>Цена за звезду</span><span>${formatMoney(currentItem.pricePerUnit)} ${currentItem.currency}</span></div>
                <div class="buy-row"><span>Количество</span><span>${qty} ⭐</span></div>
                <div class="buy-row buy-row--total"><span>К оплате</span><span>${formatMoney(total)} ${currentItem.currency}</span></div>
            `;
        } else {
            const fee = total - qty;
            breakdownEl.innerHTML = `
                <div class="buy-row"><span>Сумма пополнения</span><span>${formatMoney(qty)} ${currentItem.currency}</span></div>
                <div class="buy-row"><span>Комиссия ${currentItem.feePercent}%</span><span>+${formatMoney(fee)} ${currentItem.currency}</span></div>
                <div class="buy-row buy-row--total"><span>К оплате</span><span>${formatMoney(total)} ${currentItem.currency}</span></div>
            `;
        }

        confirmBtn.textContent = currentItem.checkoutUrl
            ? `Перейти к оплате · ${formatMoney(total)} ${currentItem.currency}`
            : `Оплатить ${formatMoney(total)} ${currentItem.currency}`;
    }

    function open(item) {
        currentItem = item;
        qty = item.type === 'unit' ? item.defaultQty : item.defaultAmount;
        method = 'card';

        titleEl.textContent = item.name;
        iconEl.innerHTML = PRODUCT_ICONS[item.icon] || '';
        descEl.textContent = item.description;
        qtyLabelEl.textContent = item.type === 'unit' ? 'Количество' : 'Сумма пополнения';
        qtySuffixEl.textContent = item.type === 'unit' ? '⭐' : item.currency;

        // Блок способов оплаты — это шаблон для будущей реальной оплаты,
        // поэтому показываем его только пока нет прямой ссылки на оплату.
        methodsEl.classList.toggle('hidden', Boolean(item.checkoutUrl));
        methodsEl.querySelectorAll('.method-chip').forEach((chip) => chip.classList.toggle('is-active', chip.dataset.method === method));

        renderBreakdown();

        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');
        requestAnimationFrame(() => { overlay.classList.add('show'); modal.classList.add('show'); });
    }

    function close() {
        overlay.classList.remove('show');
        modal.classList.remove('show');
        setTimeout(() => { overlay.classList.add('hidden'); modal.classList.add('hidden'); }, 300);
    }

    qtyDecBtn.addEventListener('click', () => {
        if (!currentItem) return;
        qty = Math.max(minQty(currentItem), qty - currentItem.step);
        renderBreakdown();
    });
    qtyIncBtn.addEventListener('click', () => {
        if (!currentItem) return;
        qty = Math.min(maxQty(currentItem), qty + currentItem.step);
        renderBreakdown();
    });

    methodsEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.method-chip');
        if (!chip) return;
        method = chip.dataset.method;
        methodsEl.querySelectorAll('.method-chip').forEach((c) => c.classList.toggle('is-active', c === chip));
    });

    confirmBtn.addEventListener('click', () => {
        if (!currentItem) return;
        const total = computeTotal(currentItem, qty);
        const priceLabel = `${formatMoney(total)} ${currentItem.currency}`;

        if (currentItem.checkoutUrl) {
            const url = new URL(currentItem.checkoutUrl);
            url.searchParams.set(currentItem.type === 'unit' ? 'qty' : 'amount', String(qty));
            url.searchParams.set('total', total.toFixed(2));
            close();
            checkoutModal?.open(url.toString(), currentItem.name);
        } else {
            close();
            showToast(`Заказ сохранён — оплата ${priceLabel} подключится позже`, 'info', 5000);
        }

        addOrderToHistory({ id: currentItem.id, name: currentItem.name, icon: currentItem.historyIcon, price: priceLabel });
    });

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });

    return { open, close };
}
