// ===== МОДАЛЬНОЕ ОКНО ЗАКАЗА (ОПЛАТА С БАЛАНСА) =====
import { state } from '../state.js';
import { tg } from '../lib/telegram.js';
import { saveLocalData } from '../lib/storage.js';
import { loadSettings, withDefaults } from '../api/settings.js';
import { createOrder } from '../api/orders.js';
import { ADMIN_TELEGRAM_ID } from '../config.js';
import { updatePricesDisplay } from './shop.js';
import { renderHistory } from './history.js';
import { renderAdminOrders } from './admin.js';
import { updateBalanceDisplay } from './profileView.js';
import { showToast } from './toast.js';

// Настройки вида полей под каждый товар. Плейсхолдер/подпись у Steam
// специально короткие (как в проф. магазинах — просто "Логин Steam"),
// без длинного пояснения прямо в поле; у Stars — префикс "@" сразу
// проставлен, чтобы не заставлять пользователя вспоминать про собаку.
const PRODUCT_CONFIG = {
    steam: {
        title: 'Пополнение Steam',
        accountLabel: 'Логин Steam',
        accountPlaceholder: 'Логин Steam',
        accountPrefill: '',
        amountLabel: 'Сумма пополнения',
        amountSuffix: '₽',
        minUnit: '₽',
        receiveUnit: (amount) => `${formatNumber(amount)} ₽ на Steam`,
        // Курс 1:1 неинформативен и только путает — бейдж показываем
        // только если сервис реально берёт комиссию (steam_price != 1).
        rate: (settings) => {
            const commission = Math.round((settings.steam_price - 1) * 100);
            return commission > 0 ? `Комиссия сервиса: ${commission}%` : null;
        },
    },
    stars: {
        title: 'Покупка Stars',
        accountLabel: 'Username получателя',
        accountPlaceholder: 'username',
        accountPrefill: '@',
        amountLabel: 'Количество Stars',
        amountSuffix: '⭐',
        minUnit: '⭐',
        receiveUnit: (amount) => `${formatNumber(amount)} ⭐`,
        rate: (settings) => `1 ⭐ = ${settings.stars_price.toFixed(2)} ₽`,
    },
};

function formatNumber(n) {
    return Number(n).toLocaleString('ru-RU');
}
function formatRub(n) {
    return `${Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

// У Stars поле username всегда должно начинаться с "@" — пользователь
// может стирать/менять всё, что после него, но сам символ "@" убрать
// нельзя (если он это сделает — тут же подставляем обратно).
function enforceStarsPrefix(input) {
    if (state.currentProduct !== 'stars') return;
    if (!input.value.startsWith('@')) {
        const cursorPos = input.selectionStart ?? input.value.length;
        input.value = '@' + input.value.replace(/^@+/, '');
        const newPos = Math.min(input.value.length, Math.max(1, cursorPos + 1));
        input.setSelectionRange(newPos, newPos);
    }
}

export function initShopButtons() {
    document.querySelectorAll('.buy-btn').forEach((btn) => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const product = this.dataset.product;
            if (product === 'soon') {
                tg.showAlert('🔜 Этот товар скоро появится');
                return;
            }
            if (!state.appData.consent) {
                tg.showAlert('Пожалуйста, примите условия согласия для покупок.');
                return;
            }
            openOrderModal(product);
        });
    });
}

export function initOrderModal() {
    const orderModal = document.getElementById('orderModal');
    const orderModalOverlay = document.getElementById('orderModalOverlay');
    const orderModalClose = document.getElementById('orderModalClose');

    orderModalClose.addEventListener('click', closeOrderModal);
    orderModalOverlay.addEventListener('click', closeOrderModal);

    document.getElementById('orderAmount').addEventListener('input', calculateOrder);
    document.getElementById('orderAccountData').addEventListener('input', function () {
        enforceStarsPrefix(this);
        calculateOrder();
    });
    document.getElementById('orderConfirmBtn').addEventListener('click', handleOrderConfirm);

    // ===== МОДАЛКА ПОДТВЕРЖДЕНИЯ ЗАКАЗА =====
    document.getElementById('orderConfirmYes').addEventListener('click', proceedWithOrder);
    document.getElementById('orderConfirmNo').addEventListener('click', closeConfirmModal);
    document.getElementById('orderConfirmModalOverlay').addEventListener('click', closeConfirmModal);
}

async function openOrderModal(product) {
    state.currentProduct = product;
    const cfg = PRODUCT_CONFIG[product];

    // Полный сброс формы к чистому состоянию — раньше здесь очищались
    // только значения полей, но не текст результата/подсказок, из-за
    // чего при переключении Steam <-> Stars на экране на мгновение (а
    // если настройки грузились медленно — то и надолго) оставались
    // цифры и подписи от предыдущего товара. Теперь всё обнуляется
    // сразу, а актуальные данные подставляются следом.
    document.getElementById('orderModalTitle').textContent = cfg.title;
    document.getElementById('orderAccountLabel').textContent = cfg.accountLabel;
    const accountInput = document.getElementById('orderAccountData');
    accountInput.placeholder = cfg.accountPlaceholder;
    accountInput.value = cfg.accountPrefill;
    accountInput.classList.remove('invalid');
    document.getElementById('orderAccountError').textContent = '';

    document.getElementById('orderAmountLabel').textContent = cfg.amountLabel;
    document.getElementById('orderAmountSuffix').textContent = cfg.amountSuffix;
    const amountInput = document.getElementById('orderAmount');
    amountInput.value = '';
    amountInput.classList.remove('invalid');

    document.getElementById('orderReceiveValue').textContent = '—';
    document.getElementById('orderPriceRub').textContent = formatRub(0);
    const balanceAfterEl = document.getElementById('orderBalanceAfter');
    balanceAfterEl.textContent = formatRub(state.appData.balance);
    balanceAfterEl.classList.remove('insufficient');

    document.getElementById('orderStep1').style.display = 'block';
    document.getElementById('orderResult').classList.remove('active');
    document.getElementById('orderConfirmBtn').disabled = true;

    document.getElementById('orderModal').classList.remove('hidden');
    document.getElementById('orderModalOverlay').classList.remove('hidden');

    // Курс/минималка сразу из того, что уже загружено в state (без
    // "прыжка" интерфейса), а следом — свежие данные из Supabase, на
    // случай если админ поменял их только что.
    applySettingsToUI(product, withDefaults(state.settings));
    const freshSettings = await loadSettings();
    if (freshSettings) {
        state.settings = freshSettings;
        updatePricesDisplay(product);
        applySettingsToUI(product, withDefaults(freshSettings));
    }

    // Курсор сразу после префикса "@" у Stars.
    accountInput.focus();
    accountInput.setSelectionRange(accountInput.value.length, accountInput.value.length);
}

function applySettingsToUI(product, settings) {
    const cfg = PRODUCT_CONFIG[product];
    const min = product === 'steam' ? settings.steam_min : settings.stars_min;

    const hint = document.getElementById('orderMinHint');
    hint.textContent = `Минимальная сумма: ${formatNumber(min)} ${cfg.minUnit}`;
    hint.classList.remove('error');

    const rateText = cfg.rate(settings);
    const badge = document.getElementById('orderRateBadge');
    badge.style.display = rateText ? '' : 'none';
    badge.textContent = rateText || '';
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.add('hidden');
    document.getElementById('orderModalOverlay').classList.add('hidden');
}

// Живой пересчёт: срабатывает на каждое нажатие клавиши в сумме или
// в поле аккаунта — пользователь сразу видит, сколько спишется и
// хватает ли баланса, без отдельной кнопки "рассчитать".
function calculateOrder() {
    const product = state.currentProduct;
    const cfg = PRODUCT_CONFIG[product];
    const settings = withDefaults(state.settings);
    const min = product === 'steam' ? settings.steam_min : settings.stars_min;

    const amountInput = document.getElementById('orderAmount');
    const accountInput = document.getElementById('orderAccountData');
    const hint = document.getElementById('orderMinHint');
    const accountError = document.getElementById('orderAccountError');
    const resultDiv = document.getElementById('orderResult');
    const confirmBtn = document.getElementById('orderConfirmBtn');

    const amountRaw = amountInput.value;
    const amount = parseFloat(amountRaw);
    const hasAmount = amountRaw !== '' && !isNaN(amount) && amount > 0;
    const amountValid = hasAmount && amount >= min;

    const accountValue = accountInput.value.trim();
    const accountValid = product === 'stars'
        ? accountValue.length > 1 // не только "@"
        : accountValue.length > 0;

    amountInput.classList.toggle('invalid', hasAmount && !amountValid);
    hint.classList.toggle('error', hasAmount && !amountValid);
    hint.textContent = (hasAmount && !amountValid)
        ? `Минимум ${formatNumber(min)} ${cfg.minUnit} — увеличьте сумму`
        : `Минимальная сумма: ${formatNumber(min)} ${cfg.minUnit}`;

    accountInput.classList.toggle('invalid', accountValue.length > 0 && !accountValid);
    accountError.textContent = '';

    if (!amountValid) {
        resultDiv.classList.remove('active');
        document.getElementById('orderReceiveValue').textContent = '—';
        document.getElementById('orderPriceRub').textContent = formatRub(0);
        const balanceAfterEl = document.getElementById('orderBalanceAfter');
        balanceAfterEl.textContent = formatRub(state.appData.balance);
        balanceAfterEl.classList.remove('insufficient');
        confirmBtn.disabled = true;
        state.calculatedPrice = 0;
        return;
    }

    const priceRub = product === 'steam' ? amount * settings.steam_price : amount * settings.stars_price;
    state.calculatedPrice = priceRub;

    const balanceAfter = state.appData.balance - priceRub;
    const insufficient = balanceAfter < 0;

    document.getElementById('orderReceiveValue').textContent = cfg.receiveUnit(amount);
    document.getElementById('orderPriceRub').textContent = formatRub(priceRub);
    const balanceAfterEl = document.getElementById('orderBalanceAfter');
    balanceAfterEl.textContent = formatRub(balanceAfter);
    balanceAfterEl.classList.toggle('insufficient', insufficient);
    resultDiv.classList.add('active');

    if (insufficient) {
        accountError.textContent = `Не хватает ${formatRub(-balanceAfter)} — пополните баланс`;
    }

    confirmBtn.disabled = !(amountValid && accountValid && !insufficient);
}

async function handleOrderConfirm() {
    if (!state.calculatedPrice || state.calculatedPrice <= 0) {
        tg.showAlert('Введите корректную сумму.');
        return;
    }
    const amount = parseFloat(document.getElementById('orderAmount').value);
    if (!amount || amount <= 0) {
        tg.showAlert('Введите сумму.');
        return;
    }
    const accountData = document.getElementById('orderAccountData').value.trim();
    if (!accountData || (state.currentProduct === 'stars' && accountData === '@')) {
        tg.showAlert('Пожалуйста, введите данные аккаунта.');
        return;
    }
    if (state.appData.balance < state.calculatedPrice) {
        tg.showAlert(`Недостаточно средств. Не хватает ${(state.calculatedPrice - state.appData.balance).toFixed(2)} ₽. Пополните баланс.`);
        return;
    }

    openConfirmModal(amount, accountData);
}

function openConfirmModal(amount, accountData) {
    const cfg = PRODUCT_CONFIG[state.currentProduct];
    const unit = state.currentProduct === 'steam' ? '₽ на Steam' : '⭐';
    document.getElementById('orderConfirmText').innerHTML =
        `Вы уверены, что хотите создать заказ на сумму <strong>${formatRub(state.calculatedPrice)}</strong>, получив <strong>${formatNumber(amount)} ${unit}</strong>?`;
    document.getElementById('orderConfirmModal').classList.remove('hidden');
    document.getElementById('orderConfirmModalOverlay').classList.remove('hidden');

    // Данные заказа сохраняем на кнопке — proceedWithOrder их прочитает
    document.getElementById('orderConfirmYes').dataset.amount = amount;
    document.getElementById('orderConfirmYes').dataset.accountData = accountData;
}

function closeConfirmModal() {
    document.getElementById('orderConfirmModal').classList.add('hidden');
    document.getElementById('orderConfirmModalOverlay').classList.add('hidden');
}

async function proceedWithOrder() {
    const yesBtn = document.getElementById('orderConfirmYes');
    const amount = parseFloat(yesBtn.dataset.amount);
    const accountData = yesBtn.dataset.accountData;
    const price = state.calculatedPrice;

    closeConfirmModal();
    yesBtn.disabled = true;

    state.appData.balance -= price;
    saveLocalData({ avatar: state.appData.avatar, orders: state.appData.orders, balance: state.appData.balance });
    updateBalanceDisplay();

    const order = await createOrder(state.user.id, state.currentProduct, amount, price, accountData);

    yesBtn.disabled = false;

    if (!order) {
        state.appData.balance += price;
        saveLocalData({ avatar: state.appData.avatar, orders: state.appData.orders, balance: state.appData.balance });
        updateBalanceDisplay();
        showToast('Не удалось создать заказ. Попробуйте позже.', 'error');
        return;
    }

    // Используем объект заказа, вернувшийся из Supabase (со статусом
    // "pending" и настоящим id), а не собранный вручную — так профиль
    // сразу показывает верный статус "В обработке", и его можно будет
    // потом обновить через refreshHistoryFromServer().
    state.appData.orders.push(order);
    saveLocalData({ avatar: state.appData.avatar, orders: state.appData.orders, balance: state.appData.balance });
    renderHistory();

    if (state.user.id === ADMIN_TELEGRAM_ID) {
        renderAdminOrders();
    }

    closeOrderModal();
    showToast('Заказ создан и передан в обработку', 'success');
}
