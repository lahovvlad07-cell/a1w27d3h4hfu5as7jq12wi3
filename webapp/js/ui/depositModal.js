// ===== ПОПОЛНЕНИЕ БАЛАНСА =====
import { state } from '../state.js';
import { tg } from '../lib/telegram.js';
import { saveLocalData } from '../lib/storage.js';
import { saveProfileToSupabase } from '../api/profile.js';
import { supabaseClient } from '../lib/supabaseClient.js';
import { withDefaults } from '../api/settings.js';
import { updateBalanceDisplay } from './profileView.js';

export function initDepositButton() {
    document.getElementById('btnDeposit').addEventListener('click', () => openDepositModal());
}

export function initDepositModal() {
    const depositModal = document.getElementById('depositModal');
    const depositModalOverlay = document.getElementById('depositModalOverlay');
    const depositModalClose = document.getElementById('depositModalClose');

    depositModalClose.addEventListener('click', closeDepositModal);
    depositModalOverlay.addEventListener('click', closeDepositModal);

    document.querySelectorAll('.deposit-crypto-btn').forEach((btn) => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.deposit-crypto-btn').forEach((b) => b.classList.remove('active'));
            this.classList.add('active');
            state.depositCrypto = this.dataset.crypto;
            if (document.getElementById('depositResult').style.display !== 'none') {
                generateDepositAddress();
            }
        });
    });

    document.getElementById('depositGenerateBtn').addEventListener('click', generateDepositAddress);

    document.getElementById('depositConfirmBtn').addEventListener('click', async function () {
        const amount = parseFloat(document.getElementById('depositAmount').value);
        if (!amount || amount <= 0) {
            tg.showAlert('Введите сумму');
            return;
        }
        state.appData.balance += amount;
        saveLocalData({ avatar: state.appData.avatar, orders: state.appData.orders, balance: state.appData.balance });
        if (supabaseClient && state.appData.consent) {
            await saveProfileToSupabase(state.user.id, {
                avatar: state.appData.avatar,
                orders: state.appData.orders,
                consent: true,
                balance: state.appData.balance,
            });
        }
        updateBalanceDisplay();
        closeDepositModal();
        tg.showAlert(`✅ Баланс пополнен на ${amount} ₽`);
    });
}

function openDepositModal() {
    const depositModal = document.getElementById('depositModal');
    const depositModalOverlay = document.getElementById('depositModalOverlay');
    depositModal.classList.remove('hidden');
    depositModalOverlay.classList.remove('hidden');
    document.getElementById('depositResult').style.display = 'none';
    document.getElementById('depositAmount').value = '';
    document.querySelectorAll('.deposit-crypto-btn').forEach((b) => b.classList.remove('active'));
    document.querySelector('.deposit-crypto-btn[data-crypto="USDT"]').classList.add('active');
    state.depositCrypto = 'USDT';
}

function closeDepositModal() {
    document.getElementById('depositModal').classList.add('hidden');
    document.getElementById('depositModalOverlay').classList.add('hidden');
}

function generateDepositAddress() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    if (!amount || amount <= 0) {
        tg.showAlert('Введите сумму');
        return;
    }
    const settings = withDefaults(state.settings);
    let rate = 0;
    if (state.depositCrypto === 'USDT') rate = settings.usdt_rate;
    else if (state.depositCrypto === 'TON') rate = settings.ton_rate;
    else if (state.depositCrypto === 'TRX') rate = settings.trx_rate;
    if (!rate) {
        tg.showAlert('Курс не установлен');
        return;
    }
    const cryptoAmount = amount / rate;
    document.getElementById('depositCryptoAmount').textContent = cryptoAmount.toFixed(4);
    // ЗАГЛУШКА: адрес генерируется случайно на клиенте, реальных крипто-платежей
    // пока нет. Когда подключишь реальный платёжный шлюз/API — замени эту
    // функцию на настоящий запрос к нему.
    const address = `0x${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    document.getElementById('depositAddress').textContent = address;
    document.getElementById('depositResult').style.display = 'block';
}
