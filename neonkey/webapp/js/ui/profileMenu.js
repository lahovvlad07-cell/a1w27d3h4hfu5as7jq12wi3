// ===== ПРОФИЛЬ В ШАПКЕ (после входа) =====
// Показывает короткую историю заказов из user_metadata (см. lib/orders.js)
// и кнопку выхода. Полноценный личный кабинет со всей историей и
// статусами заказов будет жить в Telegram-приложении — здесь достаточно
// быстрого обзора.
import { getOrderHistory } from '../lib/orders.js';
import { signOut } from '../lib/auth.js';

function displayName(user) {
    return user?.user_metadata?.telegram_first_name
        || user?.user_metadata?.first_name
        || user?.email?.split('@')[0]
        || 'Аккаунт';
}
function initial(user) {
    return displayName(user).slice(0, 1).toUpperCase();
}

export function initProfileMenu({ onSignedOut }) {
    const loginArea = document.getElementById('navLoggedOut');
    const profileArea = document.getElementById('navLoggedIn');
    const chip = document.getElementById('profileChip');
    const menu = document.getElementById('profileMenu');
    const nameEl = document.getElementById('profileName');
    const avatarEl = document.getElementById('profileAvatar');
    const ordersEl = document.getElementById('profileOrders');
    const signOutBtn = document.getElementById('profileSignOut');

    function renderOrders() {
        const orders = getOrderHistory();
        if (!orders.length) {
            ordersEl.innerHTML = '<div class="profile-empty">Заказов пока нет — они появятся здесь и в приложении сразу после первой покупки.</div>';
            return;
        }
        ordersEl.innerHTML = `
            <h5>Последние заказы</h5>
            <div class="profile-orders">
                ${orders.map((o) => `<div class="profile-order-row"><span class="name">${o.icon || ''} ${o.name}</span><span>${o.price}</span></div>`).join('')}
            </div>
        `;
    }

    function show(user) {
        loginArea.classList.add('hidden');
        profileArea.classList.remove('hidden');
        nameEl.textContent = displayName(user);
        avatarEl.textContent = initial(user);
        renderOrders();
    }

    function hide() {
        loginArea.classList.remove('hidden');
        profileArea.classList.add('hidden');
        menu.classList.remove('show');
    }

    chip.addEventListener('click', () => {
        renderOrders();
        menu.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
        if (!profileArea.contains(e.target)) menu.classList.remove('show');
    });
    signOutBtn.addEventListener('click', async () => {
        await signOut();
        hide();
        onSignedOut?.();
    });

    return { show, hide, refreshOrders: renderOrders };
}
