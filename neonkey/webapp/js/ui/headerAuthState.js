// ===== СОСТОЯНИЕ ВХОДА В ШАПКЕ ЛЕНДИНГА =====
// На главной странице профиль не разворачивается сам — здесь только
// два состояния: «Войти» (открывает authModal) или короткая ссылка
// с аватаром на личный кабинет (account.html), где уже живут профиль,
// каталог и вся остальная информация.
import { realEmail } from '../lib/telegramAuth.js';

function displayName(user) {
    return user?.user_metadata?.telegram_first_name
        || user?.user_metadata?.first_name
        || realEmail(user)?.split('@')[0]
        || 'Кабинет';
}

export function initHeaderAuthState() {
    const loggedOut = document.getElementById('navLoggedOut');
    const loggedIn = document.getElementById('navLoggedIn');
    const avatarEl = document.getElementById('navAvatar');
    const nameEl = document.getElementById('navAccountName');

    function show(user) {
        loggedOut.classList.add('hidden');
        loggedIn.classList.remove('hidden');
        avatarEl.textContent = user?.user_metadata?.avatar || '👤';
        nameEl.textContent = displayName(user);
    }

    function hide() {
        loggedOut.classList.remove('hidden');
        loggedIn.classList.add('hidden');
    }

    return { show, hide };
}
