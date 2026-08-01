// ===== ПОПОЛНЕНИЕ БАЛАНСА (реальный флоу через neonkey-pay) =====
import { state } from '../state.js';
import { tg } from '../lib/telegram.js';
import { withDefaults } from '../api/settings.js';
import { loadProfile } from '../api/profile.js';
import { updateBalanceDisplay } from './profileView.js';
import { showToast } from './toast.js';
import { PAY_API_URL, DEPOSIT_EXPIRY_MINUTES } from '../config.js';

// TRX — нативная монета сети TRON (не токен), поэтому у неё нет TRC-20.
// TRC-20 — это стандарт токенов НА сети TRON, им пользуется именно USDT.
// TON исторически на старте проекта назывался Gram — уточняем в скобках,
// чтобы люди, которые помнят это название, не путались, что это тот же TON.
const NETWORK_LABEL = {
    USDT: 'TRC-20 (сеть TRON)',
    TRX: 'TRON (нативная монета сети)',
    TON: 'TON (ранее Gram)',
};

// Код валюты в интерфейсе (USDT/TON/TRX) -> код, который понимает API neonkey-pay.
const API_CURRENCY = { USDT: 'USDT_TRC20', TON: 'TON', TRX: 'TRX' };
// Ключи настроек в таблице settings — те же суффиксы, что и в неонкей-pay/lib/rates.ts.
const SETTINGS_SUFFIX = { USDT: 'usdt', TON: 'ton', TRX: 'trx' };
const RATE_KEY = { USDT: 'usdt_rate', TON: 'ton_rate', TRX: 'trx_rate' };

function formatRub(n) {
    return `${Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
}
function formatCrypto(n, cur) {
    return `${Number(n).toFixed(4)} ${cur}`;
}
function pad2(n) {
    return String(n).padStart(2, '0');
}

// Текущий незавершённый депозит — живёт на уровне модуля (не сбрасывается
// при простом закрытии модалки), чтобы таймер/поллинг продолжали идти,
// даже если пользователь свернул модалку и открыл её снова.
let currentDeposit = null; // { depositId, apiCurrency, uiCurrency, expectedAmountCrypto, commissionRub, createdAt, expiresInMinutes, address, status }
let checkInterval = null;
let countdownInterval = null;

async function payApiFetch(path, body, _retried = false) {
    let res;
    try {
        res = await fetch(`${PAY_API_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData, ...body }),
        });
    } catch (networkError) {
        // "Failed to fetch" — запрос не дошёл вообще (не HTTP-ошибка с сервера,
        // а сетевой сбой/обрыв). Часто это разовая заминка холодного старта
        // сервера — один автоматический повтор решает её без участия человека.
        if (!_retried) {
            await new Promise((r) => setTimeout(r, 1500));
            return payApiFetch(path, body, true);
        }
        throw new Error('Не удалось связаться с платёжным сервисом (нет ответа от сервера). Попробуйте ещё раз через минуту.');
    }
    let data = {};
    try { data = await res.json(); } catch (e) { /* пустой ответ */ }
    if (!res.ok) {
        throw new Error(data.error || `Ошибка сервера платёжного сервиса (${res.status})`);
    }
    return data;
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
        calculateDepositPreview();
    });

    document.querySelectorAll('.deposit-crypto-btn').forEach((btn) => {
        btn.addEventListener('click', function () {
            if (this.disabled) return;
            document.querySelectorAll('.deposit-crypto-btn').forEach((b) => b.classList.remove('active'));
            this.classList.add('active');
            state.depositCrypto = this.dataset.crypto;
            document.getElementById('depositNetworkHint').textContent = `Сеть: ${NETWORK_LABEL[state.depositCrypto]}`;
            calculateDepositPreview();
        });
    });

    document.getElementById('depositGenerateBtn').addEventListener('click', generateDepositAddress);
    document.getElementById('depositCheckBtn').addEventListener('click', () => performCheck(true));
    document.getElementById('depositCancelBtn').addEventListener('click', resetToForm);

    document.getElementById('depositCopyBtn').addEventListener('click', async () => {
        const address = document.getElementById('depositAddress').textContent;
        if (!address || address === 'Сгенерируйте адрес') return;
        try {
            await navigator.clipboard.writeText(address);
            const btn = document.getElementById('depositCopyBtn');
            btn.classList.add('copied');
            btn.textContent = '✅';
            showToast('Адрес скопирован', 'success', 1500);
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.textContent = '📋';
            }, 1500);
        } catch (e) {
            showToast('Не удалось скопировать', 'error');
        }
    });
}

function openDepositModal() {
    document.getElementById('depositModal').classList.remove('hidden');
    document.getElementById('depositModalOverlay').classList.remove('hidden');
    // Если депозита ещё нет (или предыдущий уже закрыт confirmed/expired) —
    // показываем чистую форму. Если есть незавершённый pending — DOM и так
    // остался в состоянии "ожидаем платёж" с прошлого открытия, ничего
    // пересоздавать не нужно (таймер и поллинг всё это время продолжали идти).
    if (!currentDeposit) {
        resetToForm();
    }
}

function closeDepositModal() {
    // Намеренно НЕ сбрасываем currentDeposit/таймеры здесь — платёж всё ещё
    // ожидается, и клиентский поллинг должен продолжать идти в фоне, пока
    // модалка закрыта, а не обнуляться. Полная защита на случай, если
    // пользователь вообще закроет приложение — фоновый воркер на сервере
    // (worker.ts, cron раз в минуту).
    document.getElementById('depositModal').classList.add('hidden');
    document.getElementById('depositModalOverlay').classList.add('hidden');
}

function resetToForm() {
    stopTimers();
    currentDeposit = null;

    const amountInput = document.getElementById('depositAmount');
    amountInput.disabled = false;
    amountInput.value = '';
    document.querySelectorAll('.deposit-crypto-btn').forEach((b) => {
        b.disabled = false;
        b.classList.remove('active');
    });
    document.querySelector('.deposit-crypto-btn[data-crypto="USDT"]').classList.add('active');
    state.depositCrypto = 'USDT';
    document.getElementById('depositNetworkHint').textContent = `Сеть: ${NETWORK_LABEL.USDT}`;

    document.getElementById('depositAddress').textContent = 'Сгенерируйте адрес';
    document.getElementById('depositCommissionRow').classList.add('u-hidden');
    document.getElementById('depositPendingInfo').classList.add('u-hidden');
    document.getElementById('depositTimer').classList.remove('u-hidden');

    document.getElementById('depositGenerateBtn').classList.remove('u-hidden');
    document.getElementById('depositGenerateBtn').textContent = 'Сгенерировать адрес';
    document.getElementById('depositCheckBtn').classList.add('u-hidden');
    document.getElementById('depositCancelBtn').classList.add('u-hidden');

    calculateDepositPreview();
}

// Курс + предварительная оценка комиссии отображаются уже на этапе ввода
// суммы (до отправки на сервер) — итоговые цифры считает сервер в create.ts
// по тем же ключам settings, здесь только предпросмотр для UX.
function calculateDepositPreview() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const rateValueEl = document.getElementById('depositRateValue');
    const generateBtn = document.getElementById('depositGenerateBtn');
    const settings = withDefaults(state.settings);
    const cur = state.depositCrypto;

    const rate = settings[RATE_KEY[cur]];
    if (!rate) {
        rateValueEl.textContent = '—';
        generateBtn.disabled = true;
        return;
    }
    rateValueEl.textContent = `1 ${cur} ≈ ${rate.toFixed(2)} ₽`;
    document.getElementById('depositAddressNetwork').textContent = NETWORK_LABEL[cur];

    if (!amount || amount <= 0) {
        document.getElementById('depositCryptoAmount').textContent = `0.0000 ${cur}`;
        document.getElementById('depositCommissionRow').classList.add('u-hidden');
        generateBtn.disabled = true;
        return;
    }

    const suffix = SETTINGS_SUFFIX[cur];
    const commissionType = settings[`commission_type_${suffix}`] ?? 0;
    const commissionValue = settings[`commission_value_${suffix}`] ?? 0;
    const minAmount = settings[`min_${suffix}`] ?? 0;
    const commissionRub = commissionType === 1 ? amount * (commissionValue / 100) : commissionValue;

    if (minAmount && amount < minAmount) {
        document.getElementById('depositCryptoAmount').textContent = `мин. ${formatRub(minAmount)}`;
        document.getElementById('depositCommissionRow').classList.add('u-hidden');
        generateBtn.disabled = true;
        return;
    }

    const totalCrypto = (amount + commissionRub) / rate;
    document.getElementById('depositCryptoAmount').textContent = formatCrypto(totalCrypto, cur);
    if (commissionRub > 0) {
        document.getElementById('depositCommissionRow').classList.remove('u-hidden');
        document.getElementById('depositCommissionValue').textContent = formatRub(commissionRub);
    } else {
        document.getElementById('depositCommissionRow').classList.add('u-hidden');
    }
    generateBtn.disabled = false;
}

async function generateDepositAddress() {
    const amount = parseFloat(document.getElementById('depositAmount').value);
    if (!amount || amount <= 0) {
        tg.showAlert('Введите сумму');
        return;
    }
    const genBtn = document.getElementById('depositGenerateBtn');
    genBtn.disabled = true;
    genBtn.textContent = 'Создаём адрес...';

    try {
        const apiCurrency = API_CURRENCY[state.depositCrypto];
        const data = await payApiFetch('/api/payments/create', { currency: apiCurrency, amountRub: amount });

        currentDeposit = {
            depositId: data.depositId,
            apiCurrency,
            uiCurrency: state.depositCrypto,
            expectedAmountCrypto: data.expectedAmountCrypto,
            commissionRub: data.commissionRub || 0,
            address: data.address,
            createdAt: Date.now(),
            expiresInMinutes: data.expiresInMinutes || DEPOSIT_EXPIRY_MINUTES,
            status: 'pending',
        };

        renderPendingUI();
        startPolling();
        startCountdown();
    } catch (e) {
        showToast(`Не удалось создать адрес: ${e.message}`, 'error', 4500);
        genBtn.disabled = false;
        genBtn.textContent = 'Сгенерировать адрес';
    }
}

function renderPendingUI() {
    document.getElementById('depositAmount').disabled = true;
    document.querySelectorAll('.deposit-crypto-btn').forEach((b) => { b.disabled = true; });

    document.getElementById('depositAddress').textContent = currentDeposit.address;
    document.getElementById('depositCryptoAmount').textContent = formatCrypto(currentDeposit.expectedAmountCrypto, currentDeposit.uiCurrency);

    if (currentDeposit.commissionRub > 0) {
        document.getElementById('depositCommissionRow').classList.remove('u-hidden');
        document.getElementById('depositCommissionValue').textContent = formatRub(currentDeposit.commissionRub);
    } else {
        document.getElementById('depositCommissionRow').classList.add('u-hidden');
    }

    document.getElementById('depositGenerateBtn').classList.add('u-hidden');
    document.getElementById('depositCheckBtn').classList.remove('u-hidden');
    document.getElementById('depositCheckBtn').disabled = false;
    document.getElementById('depositCancelBtn').classList.remove('u-hidden');
    document.getElementById('depositCancelBtn').textContent = 'Отменить / новый платёж';
    document.getElementById('depositPendingInfo').classList.remove('u-hidden');
    document.getElementById('depositTimer').classList.remove('u-hidden');

    const statusEl = document.getElementById('depositStatusText');
    statusEl.textContent = '⏳ Ожидаем платёж...';
    statusEl.className = '';
}

function startCountdown() {
    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        if (!currentDeposit) { clearInterval(countdownInterval); return; }
        const totalMs = currentDeposit.expiresInMinutes * 60 * 1000;
        const remainingMs = totalMs - (Date.now() - currentDeposit.createdAt);
        const timerEl = document.getElementById('depositTimer');

        if (remainingMs <= 0) {
            timerEl.textContent = '00:00';
            clearInterval(countdownInterval);
            // Раньше здесь просто вызывался handleExpired() — красил UI
            // локально, но не трогал сервер, поэтому депозит оставался
            // pending в базе, пока (если) его не просрочит фоновый воркер.
            // Теперь явно спрашиваем сервер — verifyDeposit() сам либо
            // подтвердит платёж, если он всё же успел прийти впритык,
            // либо пометит депозит expired в базе прямо сейчас.
            performCheck(false).then(() => {
                if (currentDeposit && currentDeposit.status === 'pending') handleExpired();
            });
            return;
        }
        const m = Math.floor(remainingMs / 60000);
        const s = Math.floor((remainingMs % 60000) / 1000);
        timerEl.textContent = `${pad2(m)}:${pad2(s)}`;
        timerEl.classList.toggle('expiring', remainingMs < 60000);
    }, 1000);
}

// Пассивный клиентский поллинг — раз в минуту, пока модалка открыта или
// закрыта, но вкладка приложения жива. Это ускоряет UX (пользователю не
// обязательно жать "Проверить" самому), но НЕ является единственной
// защитой — если человек полностью закроет Mini App, довершает дело
// фоновый воркер на сервере (worker.ts + cron-job.org, раз в минуту,
// независимо от того, открыто приложение или нет).
function startPolling() {
    clearInterval(checkInterval);
    checkInterval = setInterval(() => performCheck(false), 60000);
}

function stopTimers() {
    clearInterval(checkInterval);
    clearInterval(countdownInterval);
    checkInterval = null;
    countdownInterval = null;
}

async function performCheck(forced) {
    if (!currentDeposit || currentDeposit.status !== 'pending') return;
    const checkBtn = document.getElementById('depositCheckBtn');
    const statusEl = document.getElementById('depositStatusText');

    if (forced) {
        checkBtn.disabled = true;
        statusEl.textContent = '🔄 Проверяем...';
    }
    try {
        const data = await payApiFetch('/api/payments/check', { depositId: currentDeposit.depositId });
        if (data.status === 'confirmed') {
            await handleConfirmed();
        } else if (data.status === 'expired') {
            handleExpired();
        } else {
            statusEl.textContent = data.underpaid
                ? '⚠️ Пришла неполная сумма, ожидаем остаток...'
                : '⏳ Ожидаем платёж...';
            if (forced) showToast('Платёж пока не найден', 'error', 2200);
        }
    } catch (e) {
        if (forced) showToast(`Ошибка проверки: ${e.message}`, 'error', 4000);
    } finally {
        if (forced && checkBtn) checkBtn.disabled = false;
    }
}

async function handleConfirmed() {
    stopTimers();
    if (currentDeposit) currentDeposit.status = 'confirmed';

    const statusEl = document.getElementById('depositStatusText');
    statusEl.textContent = '✅ Платёж получен, баланс пополнен!';
    statusEl.className = 'confirmed';
    document.getElementById('depositCheckBtn').classList.add('u-hidden');
    document.getElementById('depositTimer').classList.add('u-hidden');
    document.getElementById('depositCancelBtn').classList.remove('u-hidden');
    document.getElementById('depositCancelBtn').textContent = 'Новое пополнение';

    // Баланс уже начислен на сервере через increment_balance (RPC), нам
    // нужно просто перечитать его из Supabase — не считаем локально, чтобы
    // не разойтись с реальным значением.
    const profile = await loadProfile(state.user.id);
    state.appData.balance = profile.balance || 0;
    updateBalanceDisplay();
    tg.showAlert('✅ Баланс пополнен!');
    currentDeposit = null;
}

function handleExpired() {
    stopTimers();
    if (currentDeposit) currentDeposit.status = 'expired';

    const statusEl = document.getElementById('depositStatusText');
    statusEl.textContent = '❌ Время вышло, платёж не найден. Создайте новый адрес.';
    statusEl.className = 'expired';
    document.getElementById('depositTimer').textContent = '00:00';
    document.getElementById('depositCheckBtn').classList.add('u-hidden');
    document.getElementById('depositCancelBtn').classList.remove('u-hidden');
    document.getElementById('depositCancelBtn').textContent = 'Новый платёж';
    currentDeposit = null;
}
