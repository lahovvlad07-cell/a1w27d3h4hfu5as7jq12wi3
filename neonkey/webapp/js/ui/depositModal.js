// ===== ПОПОЛНЕНИЕ БАЛАНСА =====
import { state } from '../state.js';
import { tg } from '../lib/telegram.js';
import { saveLocalData } from '../lib/storage.js';
import { saveProfileToSupabase } from '../api/profile.js';
import { supabaseClient } from '../lib/supabaseClient.js';
import { withDefaults } from '../api/settings.js';
import { updateBalanceDisplay } from './profileView.js';

const NETWORK_LABEL = {
    USDT: 'TRC-20 (Tron)',
    TRX: 'Tron (TRC-20)',
    TON: 'TON',
};

function formatRub(n) {
    return `${Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}

export function initDepositButton() {
    document.getElementById('btnDeposit').addEventListener('click', () => openDepositModal());
}

export function initDepositModal() {
    const depositModal = document.getElementById('depositModal');
    const depositModalOverlay = document.getElementById('depositModalOverlay');
    const depositModalClose = document.getElementById('depositModalClose');

    depositModalClose.addEventListener('click', closeDepositModal);
    depositModalOverlay.addEventListener('click', closeDepositModal);

    document.getElementById('depositAmount').addEventListener('input', () => {
        hideGeneratedAddress();
        calculateDepositPreview();
    });

    document.querySelectorAll('.deposit-crypto-btn').forEach((btn) => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.deposit-crypto-btn').forEach((b) => b.classList.remove('active'));
            this.classList.add('active');
            state.depositCrypto = this.dataset.crypto;
            document.getElementById('depositNetworkHint').textContent = `Сеть: ${NETWORK_LABEL[state.depositCrypto]}`;
            hideGeneratedAddress();
            calculateDepositPreview();
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
        tg.showAlert(`✅ Баланс пополнен на ${amount} ₽ (тестовый режим)`);
    });
}

function openDepositModal() {
    const depositModal = document.getElementById('depositModal');
    const depositModalOverlay = document.getElementById('depositModalOverlay');
    depositModal.classList.remove('hidden');
    depositModalOverlay.classList.remove('hidden');
    document.getElementById('depositAmount').value = '';
    document.querySelectorAll('.deposit-crypto-btn').forEach((b) => b.classList.remove('active'));
    document.querySelector('.deposit-crypto-btn[data-crypto="USDT"]').classList.add('active');
    state.depositCrypto = 'USDT';
    document.getElementById('depositNetworkHint').textContent = `Сеть: ${NETWORK_LABEL.USDT}`;
    document.getElementById('depositLiveRate').style.display = 'none';
    hideGeneratedAddress();
    resetDepositResult();
}

function closeDepositModal() {
    document.getElementById('depositModal').classList.add('hidden');
    document.getElementById('depositModalOverlay').classList.add('hidden');
}

function resetDepositResult() {
    const resultDiv = document.getElementById('depositResult');
    resultDiv.classList.remove('active');
    document.getElementById('depositCryptoAmount').textContent = `0.0000 ${state.depositCrypto}`;
    document.getElementById('depositAddress').textContent = 'Сгенерируйте адрес';
    document.getElementById('depositGenerateBtn').disabled = true;
}

function hideGeneratedAddress() {
    document.getElementById('depositAddress').textContent = 'Сгенерируйте адрес';
    document.getElementById('depositConfirmBtn').style.display = 'none';
    document.getElementById('depositGenerateBtn').style.display = '';
}

// Живой пересчёт курса — показывается сразу по мере ввода суммы,
// ещё до генерации адреса, чтобы пользователь сразу видел, сколько
// криптовалюты отправлять.
function calculateDepositPreview() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const rateBadge = document.getElementById('depositLiveRate');
    const resultDiv = document.getElementById('depositResult');
    const generateBtn = document.getElementById('depositGenerateBtn');
    const settings = withDefaults(state.settings);

    const rateKey = { USDT: 'usdt_rate', TON: 'ton_rate', TRX: 'trx_rate' }[state.depositCrypto];
    const rate = settings[rateKey];

    if (!rate) {
        rateBadge.style.display = 'none';
        resultDiv.classList.remove('active');
        generateBtn.disabled = true;
        return;
    }

    rateBadge.style.display = '';
    rateBadge.textContent = `Курс: 1 ${state.depositCrypto} ≈ ${rate.toFixed(2)} ₽`;

    if (!amount || amount <= 0) {
        resultDiv.classList.remove('active');
        generateBtn.disabled = true;
        return;
    }

    const cryptoAmount = amount / rate;
    document.getElementById('depositCryptoAmount').textContent = `${cryptoAmount.toFixed(4)} ${state.depositCrypto}`;
    document.getElementById('depositAddressNetwork').textContent = NETWORK_LABEL[state.depositCrypto];
    resultDiv.classList.add('active');
    generateBtn.disabled = false;
}

function generateDepositAddress() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    if (!amount || amount <= 0) {
        tg.showAlert('Введите сумму');
        return;
    }
    const settings = withDefaults(state.settings);
    const rateKey = { USDT: 'usdt_rate', TON: 'ton_rate', TRX: 'trx_rate' }[state.depositCrypto];
    const rate = settings[rateKey];
    if (!rate) {
        tg.showAlert('Курс не установлен');
        return;
    }
    calculateDepositPreview();
    // ЗАГЛУШКА: адрес генерируется случайно на клиенте, реальных крипто-платежей
    // пока нет. Когда подключишь реальный платёжный шлюз/API — замени эту
    // функцию на настоящий запрос к нему. ВАЖНО: до этого момента интерфейс
    // явно помечает происходящее как тестовый режим (см. .deposit-demo-banner),
    // чтобы никто не отправил сюда настоящую криптовалюту.
    const address = `DEMO-${state.depositCrypto}-${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`;
    document.getElementById('depositAddress').textContent = address;
    document.getElementById('depositGenerateBtn').style.display = 'none';
    document.getElementById('depositConfirmBtn').style.display = '';
}
