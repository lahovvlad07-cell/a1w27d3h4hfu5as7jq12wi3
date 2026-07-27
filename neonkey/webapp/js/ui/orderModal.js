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
    document.getElementById('orderConfirmBtn').addEventListener('click', handleOrderConfirm);
    document.getElementById('orderCloseBtn').addEventListener('click', closeOrderModal);
}

async function openOrderModal(product) {
    state.currentProduct = product;
    const freshSettings = await loadSettings();
    if (freshSettings) {
        state.settings = freshSettings;
        updatePricesDisplay(product);
    }
    const settings = withDefaults(state.settings);

    document.getElementById('orderModalTitle').textContent = product === 'steam' ? 'Пополнение Steam' : 'Покупка Stars';
    document.getElementById('orderStep1').style.display = 'block';
    document.getElementById('orderStep2').style.display = 'none';
    document.getElementById('orderResult').style.display = 'none';
    document.getElementById('orderAmount').value = '';
    document.getElementById('orderAccountData').value = '';

    const min = product === 'steam' ? settings.steam_min : settings.stars_min;
    document.getElementById('orderMinValue').textContent = min;

    document.getElementById('orderModal').classList.remove('hidden');
    document.getElementById('orderModalOverlay').classList.remove('hidden');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.add('hidden');
    document.getElementById('orderModalOverlay').classList.add('hidden');
}

function calculateOrder() {
    const amountInput = document.getElementById('orderAmount');
    const amount = parseFloat(amountInput.value);
    const resultDiv = document.getElementById('orderResult');
    if (!amount || amount <= 0) {
        resultDiv.style.display = 'none';
        return;
    }

    const settings = withDefaults(state.settings);
    const product = state.currentProduct;
    const min = product === 'steam' ? settings.steam_min : settings.stars_min;
    if (amount < min) {
        resultDiv.style.display = 'none';
        return;
    }

    const priceRub = product === 'steam' ? amount * settings.steam_price : amount * settings.stars_price;
    state.calculatedPrice = priceRub;

    document.getElementById('orderPriceRub').textContent = priceRub.toFixed(2);
    document.getElementById('orderUserBalance').textContent = state.appData.balance.toFixed(2);
    resultDiv.style.display = 'block';
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
    if (!accountData) {
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
