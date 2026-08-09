// ===== ЗАПОЛНЕНИЕ ПРОФИЛЯ =====
// Баланса и истории заказов в приложении больше нет (см. README) —
// заказы, оплату и доставку целиком ведёт Digiseller, а не этот сайт.
// Профиль теперь показывает только то, что реально относится к
// аккаунту на этом сайте: аватар, email и дату регистрации.
import { state } from '../state.js';
import { signOut } from '../lib/auth.js';

export function renderProfile() {
    const emailEl = document.getElementById('userEmail');
    const sinceEl = document.getElementById('userSince');
    const avatarEl = document.getElementById('userAvatar');

    emailEl.textContent = state.user?.email || '—';
    if (state.user?.created_at) {
        const date = new Date(state.user.created_at).toLocaleDateString('ru-RU', {
            day: '2-digit', month: 'long', year: 'numeric',
        });
        sinceEl.textContent = `Аккаунт создан ${date}`;
    } else {
        sinceEl.textContent = '';
    }
    if (state.avatar) avatarEl.textContent = state.avatar;
}

export function initSignOut(onSignedOut) {
    document.getElementById('signOutBtn')?.addEventListener('click', async () => {
        await signOut();
        onSignedOut();
    });
}
