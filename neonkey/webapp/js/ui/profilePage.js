// ===== ВКЛАДКА «ПРОФИЛЬ» =====
import { state } from '../state.js';
import { getOrderHistory } from '../lib/orders.js';
import { signOut, updateUserMetadata, linkEmailPassword } from '../lib/auth.js';
import { showToast } from './toast.js';

// Служебный email аккаунтов, созданных через вход по Telegram (см.
// telegramPlaceholderEmail() в supabase/functions/_shared/telegram.ts) —
// пользователь его никогда не задавал сам, поэтому показывать такой адрес
// как "привязанный email" неправильно: именно это раньше выглядело как
// "какой-то левый email взялся из ниоткуда".
const PLACEHOLDER_EMAIL_SUFFIX = '@telegram.neonkey.local';

function realEmail(user) {
    const email = user?.email;
    if (!email || email.endsWith(PLACEHOLDER_EMAIL_SUFFIX)) return null;
    return email;
}

function displayName(user) {
    return user?.user_metadata?.display_name
        || user?.user_metadata?.telegram_first_name
        || user?.user_metadata?.first_name
        || realEmail(user)?.split('@')[0]
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
    const linkEmailBtn = document.getElementById('linkEmailBtn');
    const emailLinkRow = document.getElementById('emailLinkRow');
    const emailLinkInput = document.getElementById('linkEmailInput');
    const emailLinkPassword = document.getElementById('linkEmailPassword');
    const emailLinkSaveBtn = document.getElementById('linkEmailSaveBtn');
    const emailLinkCancelBtn = document.getElementById('linkEmailCancelBtn');

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
        metaEl.textContent = realEmail(user) || 'Вход через Telegram';

        const email = realEmail(user);
        const hasTelegram = Boolean(user.user_metadata?.telegram_id);

        emailStatus.textContent = email || 'не привязан';
        emailStatus.className = `link-row-status ${email ? 'is-linked' : 'is-empty'}`;
        linkEmailBtn?.classList.toggle('hidden', Boolean(email));

        tgStatus.textContent = hasTelegram ? `@${user.user_metadata?.telegram_username || 'привязан'}` : 'не привязан';
        tgStatus.className = `link-row-status ${hasTelegram ? 'is-linked' : 'is-empty'}`;
        linkTelegramBtn?.classList.toggle('hidden', hasTelegram);

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

    // ---------- Имя ----------
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

    // ---------- Привязать email (для аккаунтов, вошедших через Telegram) ----------
    function openEmailLink() {
        emailLinkInput.value = '';
        emailLinkPassword.value = '';
        emailLinkRow.classList.remove('hidden');
        emailLinkInput.focus();
    }
    function closeEmailLink() {
        emailLinkRow.classList.add('hidden');
    }
    async function saveEmailLink() {
        const email = emailLinkInput.value.trim();
        const password = emailLinkPassword.value;
        if (!email || !email.includes('@')) { showToast('Введите корректный email', 'error'); return; }
        if (password.length < 6) { showToast('Пароль должен быть не короче 6 символов', 'error'); return; }

        emailLinkSaveBtn.disabled = true;
        const { user, error } = await linkEmailPassword(email, password);
        emailLinkSaveBtn.disabled = false;
        if (error) { showToast(`Не удалось привязать email: ${error}`, 'error', 6000); return; }

        if (user) state.user = user;
        closeEmailLink();
        render();
        // Если в проекте включено подтверждение email, адрес обновится только
        // после перехода по ссылке из письма — предупреждаем об этом сразу,
        // чтобы это не выглядело как ещё одна "пропажа" данных.
        showToast('Проверьте почту — если нужно подтверждение, email обновится после перехода по ссылке из письма', 'success', 6000);
    }

    linkEmailBtn?.addEventListener('click', openEmailLink);
    emailLinkCancelBtn?.addEventListener('click', closeEmailLink);
    emailLinkSaveBtn?.addEventListener('click', saveEmailLink);
    emailLinkPassword?.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveEmailLink(); });

    signOutBtn.addEventListener('click', async () => {
        await signOut();
        onSignedOut?.();
    });

    return { render };
}
