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

// Настройки вида полей под каждый товар — чтобы подписи и плейсхолдеры
// соответствовали тому, что реально нужно ввести (это то, что раньше
// было одинаковым для Steam и Stars и вводило в заблуждение).
const PRODUCT_CONFIG = {
    steam: {
        title: 'Пополнение Steam',
        accountLabel: 'Логин Steam или ссылка на профиль',
        accountPlaceholder: 'например: my_login или steamcommunity.com/id/...',
        accountPrefill: '',
        amountLabel: 'Сумма пополнения',
        amountSuffix: '₽',
        minUnit: '₽',
        receiveUnit: (amount) => `${formatNumber(amount)} ₽ на Steam`,
        rate: (settings) => `Курс: 1 ₽ пополнения = ${settings.steam_price.toFixed(2)} ₽`,
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
        rate: (settings) => `Курс: 1 ⭐ = ${settings.stars_price.toFixed(2)} ₽`,
    },
};

function formatNumber(n) {
    return Number(n).toLocaleString('ru-RU');
}
function formatRub(n) {
    return `${Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
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
    document.getElementById('orderAccountData').addEventListener('input', calculateOrder);
    document.getElementById('orderConfirmBtn').addEventListener('click', handleOrderConfirm);
    document.getElementById('orderCloseBtn').addEventListener('click', closeOrderModal);
}

async function openOrderModal(product) {
    state.currentProduct = product;
    const cfg = PRODUCT_CONFIG[product];

    // Сброс формы к чистому состоянию до подгрузки актуальных настроек,
    // чтобы не мелькали старые данные другого товара.
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

    document.getElementById('orderStep1').style.display = 'block';
    document.getElementById('orderStep2').style.display = 'none';
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
        calculateOrder();
    }

    // Курсор сразу после префикса "@" у Stars.
    accountInput.focus();
    accountInput.setSelectionRange(accountInput.value.length, accountInput.value.length);
}

function applySettingsToUI(product, settings) {
    const cfg = PRODUCT_CONFIG[product];
    const min = product === 'steam' ? settings.steam_min : settings.stars_min;
    document.getElementById('orderMinValue').textContent = `${formatNumber(min)} ${cfg.minUnit}`;
    document.getElementById('orderRateBadge').textContent = cfg.rate(settings);
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
    const amountError = document.getElementById('orderMinHint');
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

    // Подсветка невалидных полей
    amountInput.classList.toggle('invalid', hasAmount && !amountValid);
    amountError.classList.toggle('error', hasAmount && !amountValid);
    amountError.textContent = (hasAmount && !amountValid)
        ? `Минимум ${formatNumber(min)} ${cfg.minUnit} — увеличьте сумму`
        : `Минимальная сумма: ${formatNumber(min)} ${cfg.minUnit}`;

    accountInput.classList.toggle('invalid', accountValue.length > 0 && !accountValid);
    accountError.textContent = '';

    if (!amountValid) {
        resultDiv.classList.remove('active');
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

    const confirmed = await new Promise((resolve) => {
        tg.showPopup(
            {
                title: 'Подтверждение заказа',
                message: `Вы уверены, что хотите купить товар за ${state.calculatedPrice.toFixed(2)} ₽?`,
                buttons: [{ type: 'ok', text: 'Да' }, { type: 'cancel', text: 'Отмена' }],
            },
            (buttonId) => resolve(buttonId === 'ok')
        );
    });
    if (!confirmed) return;

    const price = state.calculatedPrice;
    state.appData.balance -= price;
    saveLocalData({ avatar: state.appData.avatar, orders: state.appData.orders, balance: state.appData.balance });
    updateBalanceDisplay();

    const order = await createOrder(state.user.id, state.currentProduct, amount, price, accountData);

    if (!order) {
        state.appData.balance += price;
        saveLocalData({ avatar: state.appData.avatar, orders: state.appData.orders, balance: state.appData.balance });
        updateBalanceDisplay();
        tg.showAlert('Не удалось создать заказ. Попробуйте позже.');
        return;
    }

    state.appData.orders.push({
        productName: state.currentProduct === 'steam' ? 'Пополнение Steam' : 'Telegram Stars',
        date: new Date().toLocaleString('ru-RU'),
        amount: `${amount} ${state.currentProduct === 'steam' ? '₽' : 'Stars'}`,
    });
    saveLocalData({ avatar: state.appData.avatar, orders: state.appData.orders, balance: state.appData.balance });
    renderHistory();

    if (state.user.id === ADMIN_TELEGRAM_ID) {
        renderAdminOrders();
    }

    document.getElementById('orderStep1').style.display = 'none';
    document.getElementById('orderStep2').style.display = 'block';
}
