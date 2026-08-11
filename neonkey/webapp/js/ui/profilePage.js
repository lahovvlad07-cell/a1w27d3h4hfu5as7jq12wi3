// ===== ВКЛАДКА «ПРОФИЛЬ» =====
import { state } from '../state.js';
import { getOrderHistory } from '../lib/orders.js';
import { signOut, updateUserMetadata } from '../lib/auth.js';
import { showToast } from './toast.js';

function displayName(user) {
    return user?.user_metadata?.display_name
        || user?.user_metadata?.telegram_first_name
        || user?.user_metadata?.first_name
        || user?.email?.split('@')[0]
        || 'Аккаунт';
}

function formatDate(iso) {
    try {
        return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch { return ''; }
}

export function initProfilePage({ avatarPicker, telegramLinkModal, onSignedOut }) {
    const avatarBtn = document.getElementById('profileAvatarBig');
    const nameEl = document.getElementById('profileNameBig');
    const nameRow = document.getElementById('profileNameRow');
    const nameEditBtn = document.getElementById('editNameBtn');
    const nameEditRow = document.getElementById('nameEditRow');
    const nameInput = document.getElementById('nameEditInput');
    const nameSaveBtn = document.getElementById('nameSaveBtn');
    const nameCancelBtn = document.getElementById('nameCancelBtn');
    const metaEl = document.getElementById('profileMetaBig');
    const emailStatus = document.getElementById('linkedEmailStatus');
    const tgStatus = document.getElementById('linkedTelegramStatus');
    const linkTelegramBtn = document.getElementById('linkTelegramBtn');
    const ordersEl = document.getElementById('orderHistoryList');
    const ordersEmpty = document.getElementById('orderHistoryEmpty');
    const signOutBtn = document.getElementById('signOutBtn');

    function render() {
        const user = state.user;
        if (!user) return;

        avatarBtn.textContent = user.user_metadata?.avatar || '👤';
        nameEl.textContent = displayName(user);
        metaEl.textContent = user.email || 'Вход через Telegram';

        const hasEmail = Boolean(user.email && !user.user_metadata?.telegram_only);
        const hasTelegram = Boolean(user.user_metadata?.telegram_id);
        emailStatus.textContent = user.email ? user.email : 'не привязан';
        emailStatus.className = `link-row-status ${user.email ? 'is-linked' : 'is-empty'}`;
        tgStatus.textContent = hasTelegram ? `@${user.user_metadata?.telegram_username || 'привязан'}` : 'не привязан';
        tgStatus.className = `link-row-status ${hasTelegram ? 'is-linked' : 'is-empty'}`;
        if (linkTelegramBtn) linkTelegramBtn.classList.toggle('hidden', hasTelegram);
        void hasEmail;

        const orders = getOrderHistory();
        if (!orders.length) {
            ordersEl.innerHTML = '';
            ordersEmpty.classList.remove('hidden');
        } else {
            ordersEmpty.classList.add('hidden');
            ordersEl.innerHTML = orders.map((o) => `
                <div class="order-row">
                    <span class="name">${o.icon || ''} ${o.name}</span>
                    <span class="date">${formatDate(o.date)} · ${o.price}</span>
                </div>
            `).join('');
        }
    }

    avatarBtn.addEventListener('click', () => avatarPicker.open());
    linkTelegramBtn?.addEventListener('click', () => telegramLinkModal?.open());

    function openNameEdit() {
        nameInput.value = state.user?.user_metadata?.display_name || displayName(state.user);
        nameRow.classList.add('hidden');
        nameEditRow.classList.remove('hidden');
        nameInput.focus();
        nameInput.select();
    }
    function closeNameEdit() {
        nameEditRow.classList.add('hidden');
        nameRow.classList.remove('hidden');
    }
    async function saveName() {
        const value = nameInput.value.trim();
        if (!value) { showToast('Имя не может быть пустым', 'error'); return; }
        const { user, error } = await updateUserMetadata({ display_name: value });
        if (error) { showToast('Не удалось сохранить имя', 'error'); return; }
        state.user = user;
        closeNameEdit();
        render();
        showToast('Имя обновлено', 'success');
    }

    nameEditBtn.addEventListener('click', openNameEdit);
    nameCancelBtn.addEventListener('click', closeNameEdit);
    nameSaveBtn.addEventListener('click', saveName);
    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveName();
        if (e.key === 'Escape') closeNameEdit();
    });

    signOutBtn.addEventListener('click', async () => {
        await signOut();
        onSignedOut?.();
    });

    return { render };
}
