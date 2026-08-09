// ===== ЗАПОЛНЕНИЕ ПРОФИЛЯ =====
// Профиль показывает: аватар, способ входа (email и/или Telegram — можно
// привязать оба сразу), и последние 5 заказов (см. lib/orders.js).
import { state } from '../state.js';
import { signOut } from '../lib/auth.js';
import { supabaseClient } from '../lib/supabaseClient.js';
import { getOrderHistory } from '../lib/orders.js';
import { renderTelegramLoginWidget, linkTelegramToCurrentUser } from '../lib/telegramAuth.js';
import { showToast } from './toast.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Служебный email вида tg-123456@telegram.neonkey.local — не показываем как есть. */
function isPlaceholderEmail(email) {
    return /^tg-\d+@telegram\.neonkey\.local$/.test(email || '');
}

export function renderProfile() {
    const sinceEl = document.getElementById('userSince');
    const avatarEl = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userEmail');

    const user = state.user;
    const hasRealEmail = user?.email && !isPlaceholderEmail(user.email);
    const telegramUsername = user?.user_metadata?.telegram_username;
    const telegramFirstName = user?.user_metadata?.telegram_first_name;

    // ===== Имя в шапке: реальный email, иначе имя из Telegram =====
    if (hasRealEmail) {
        nameEl.textContent = user.email;
    } else if (telegramFirstName || telegramUsername) {
        nameEl.textContent = telegramUsername ? `@${telegramUsername}` : telegramFirstName;
    } else {
        nameEl.textContent = '—';
    }

    if (user?.created_at) {
        const date = new Date(user.created_at).toLocaleDateString('ru-RU', {
            day: '2-digit', month: 'long', year: 'numeric',
        });
        sinceEl.textContent = `Аккаунт создан ${date}`;
    } else {
        sinceEl.textContent = '';
    }
    if (state.avatar) avatarEl.textContent = state.avatar;

    renderLinkedAccounts(user, hasRealEmail);
    renderOrderHistory();
}

// ===== БЛОК "СПОСОБЫ ВХОДА" (email / Telegram) =====
function renderLinkedAccounts(user, hasRealEmail) {
    const emailStatusEl = document.getElementById('linkedEmailStatus');
    const telegramStatusEl = document.getElementById('linkedTelegramStatus');
    const addEmailForm = document.getElementById('addEmailForm');
    const telegramLinkWrap = document.getElementById('telegramLinkWidget');

    const hasTelegram = !!user?.user_metadata?.telegram_id;

    if (emailStatusEl) {
        emailStatusEl.textContent = hasRealEmail ? `✅ ${user.email}` : 'не привязан';
    }
    if (addEmailForm) addEmailForm.classList.toggle('u-hidden', hasRealEmail);

    if (telegramStatusEl) {
        telegramStatusEl.textContent = hasTelegram
            ? `✅ ${user.user_metadata.telegram_username ? '@' + user.user_metadata.telegram_username : user.user_metadata.telegram_first_name || 'привязан'}`
            : 'не привязан';
    }
    if (telegramLinkWrap) telegramLinkWrap.classList.toggle('u-hidden', hasTelegram);
}

// ===== БЛОК "ПОСЛЕДНИЕ ЗАКАЗЫ" =====
function renderOrderHistory() {
    const listEl = document.getElementById('orderHistoryList');
    const emptyEl = document.getElementById('orderHistoryEmpty');
    if (!listEl) return;

    const orders = getOrderHistory();

    if (!orders.length) {
        listEl.innerHTML = '';
        emptyEl?.classList.remove('u-hidden');
        return;
    }
    emptyEl?.classList.add('u-hidden');

    listEl.innerHTML = orders.map((o) => {
        const date = new Date(o.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
        return `
            <div class="order-row">
                <span class="order-icon">${o.icon || '🛒'}</span>
                <div class="order-info">
                    <div class="order-name">${o.name}</div>
                    <div class="order-date">${date}</div>
                </div>
                <div class="order-price">${o.price || ''}</div>
            </div>
        `;
    }).join('');
}

export function initProfileLinking() {
    // ===== Привязать email (если аккаунт создан через Telegram) =====
    const addEmailForm = document.getElementById('addEmailForm');
    addEmailForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('addEmailInput');
        const email = input.value.trim();
        const btn = document.getElementById('addEmailSubmit');

        if (!EMAIL_RE.test(email)) {
            showToast('Введите корректный email', 'error');
            return;
        }
        btn.disabled = true;
        const { error } = await supabaseClient.auth.updateUser({ email });
        btn.disabled = false;

        if (error) {
            showToast(`Не удалось привязать email: ${error.message}`, 'error', 4000);
            return;
        }
        showToast('Письмо для подтверждения отправлено на почту', 'success', 4000);
        input.value = '';
    });

    // ===== Привязать Telegram (если аккаунт создан по email) =====
    renderTelegramLoginWidget('telegramLinkWidget', {
        buttonSize: 'medium',
        onAuth: async (telegramUser) => {
            const { error } = await linkTelegramToCurrentUser(telegramUser);
            if (error) {
                showToast(`Не удалось привязать Telegram: ${error}`, 'error', 4000);
                return;
            }
            const { data } = await supabaseClient.auth.getUser();
            if (data?.user) state.user = data.user;
            showToast('Telegram привязан', 'success');
            renderProfile();
        },
    });
}

export function initSignOut(onSignedOut) {
    document.getElementById('signOutBtn')?.addEventListener('click', async () => {
        await signOut();
        onSignedOut();
    });
}
