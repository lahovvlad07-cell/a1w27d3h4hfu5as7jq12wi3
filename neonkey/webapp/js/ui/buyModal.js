// ===== МОДАЛКА ОФОРМЛЕНИЯ ПОКУПКИ =====
// Открывается по кнопке «Купить» в каталоге (см. ui/catalogView.js).
// Композиция как у обычного платёжного чекаута: крупное поле суммы с
// чипами быстрого выбора (без +/- — набирать по одному клику на кнопку
// неудобно, когда сумма может быть и 100, и 5000), разбивка цены и итог.
//
// Сама оплата — ШАБЛОН, не реальная интеграция:
//   - если у товара уже указан checkoutUrl (см. data/catalog.js) — модалка
//     передаёт эстафету дальше, во встроенное окно оплаты (checkoutModal) —
//     это уже реальный переход на страницу платёжной системы;
//   - если checkoutUrl ещё нет (сейчас так у обоих товаров) — показывается
//     блок «Способ оплаты» с чипами и кнопка «Оплатить», но по нажатию
//     ничего не списывается — просто сохраняется заказ (как и раньше, это
//     лог намерения купить, см. README → «Честная оговорка про историю
//     заказов»). Когда появится реальный платёжный провайдер, замени
//     обработчик confirmBtn на настоящий вызов оплаты — вёрстка и разбивка
//     цены уже готовы, менять надо только сам платёж.
//
// ПОРТИРОВАНИЕ В MINI APP: вся логика цены и валидации вынесена в чистые
// функции без DOM (formatMoney/computeTotal/clampQty/qtyHint выше) — их
// можно скопировать как есть в мини-апп и обвязать своей вёрсткой.
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
function clampQty(item, value) {
    const min = minQty(item);
    const max = maxQty(item);
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.round(value)));
}
function qtyHint(item) {
    const min = minQty(item);
    const max = maxQty(item);
    return item.type === 'unit'
        ? `От ${min} до ${max} звёзд`
        : `От ${formatMoney(min)} до ${formatMoney(max)} ${item.currency}`;
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
    const qtyHintEl = document.getElementById('buyQtyHint');
    const quickRowEl = document.getElementById('buyQuickRow');
    const breakdownEl = document.getElementById('buyBreakdown');
    const methodsEl = document.getElementById('buyMethods');
    const confirmBtn = document.getElementById('buyConfirmBtn');

    let currentItem = null;
    let qty = 0;
    let method = 'card';

    function setActiveQuickChip() {
        quickRowEl.querySelectorAll('.quick-chip').forEach((chip) => {
            chip.classList.toggle('is-active', Number(chip.dataset.value) === qty);
        });
    }

    // syncInput=false — при вводе с клавиатуры не трогаем поле, чтобы не
    // сбивать курсор и не мешать печатать; итог и разбивку всё равно
    // пересчитываем по введённому (пусть даже промежуточному) числу.
    function renderBreakdown(syncInput = true) {
        if (syncInput) qtyValueEl.value = qty;
        setActiveQuickChip();
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
        qtyHintEl.textContent = qtyHint(item);
        qtyValueEl.min = minQty(item);
        qtyValueEl.max = maxQty(item);

        quickRowEl.innerHTML = (item.quickAmounts || [])
            .map((v) => `<button type="button" class="quick-chip" data-value="${v}">${v}${item.type === 'unit' ? ' ⭐' : ` ${item.currency}`}</button>`)
            .join('');

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

    quickRowEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.quick-chip');
        if (!chip || !currentItem) return;
        qty = clampQty(currentItem, Number(chip.dataset.value));
        renderBreakdown();
    });

    // Свободный ввод числа с клавиатуры — считаем разбивку сразу по мере
    // печати, а к границам min/max подгоняем только при уходе с поля
    // (иначе нельзя было бы стереть цифру и напечатать другую).
    qtyValueEl.addEventListener('input', () => {
        if (!currentItem) return;
        const raw = Number(qtyValueEl.value);
        if (qtyValueEl.value !== '' && Number.isFinite(raw)) {
            qty = raw;
            renderBreakdown(false);
        }
    });
    qtyValueEl.addEventListener('blur', () => {
        if (!currentItem) return;
        qty = clampQty(currentItem, Number(qtyValueEl.value));
        renderBreakdown();
    });
    qtyValueEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') qtyValueEl.blur();
    });

    methodsEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.method-chip');
        if (!chip) return;
        method = chip.dataset.method;
        methodsEl.querySelectorAll('.method-chip').forEach((c) => c.classList.toggle('is-active', c === chip));
    });

    confirmBtn.addEventListener('click', () => {
        if (!currentItem) return;
        // На случай, если "Оплатить" нажали сразу после печати, не дожидаясь blur.
        qty = clampQty(currentItem, Number(qtyValueEl.value));
        renderBreakdown();

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
