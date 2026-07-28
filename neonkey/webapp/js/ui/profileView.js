// ===== ЗАПОЛНЕНИЕ ПРОФИЛЯ (ИМЯ, ID, БАЛАНС, АВАТАР) =====
import { state } from '../state.js';
import { loadBiggestOrder } from '../api/orders.js';

const PRODUCT_LABEL = { steam: 'Пополнение Steam', stars: 'Telegram Stars' };

export function renderProfile() {
    const userName = document.getElementById('userName');
    const userIdEl = document.getElementById('userId');
    const avatarEl = document.getElementById('userAvatar');

    userName.textContent = state.user.first_name || 'Гость';
    userIdEl.textContent = '@' + (state.user.username || 'не указан');
    if (state.appData.avatar) avatarEl.textContent = state.appData.avatar;
    updateBalanceDisplay();
}

export function updateBalanceDisplay() {
    document.getElementById('balance').textContent = `${state.appData.balance.toFixed(2)} ₽`;
}

// Подтягивает крупнейшую завершённую сделку пользователя из Supabase и
// обновляет карточку в профиле. Вызывается при запуске и при каждом
// открытии вкладки "Профиль" (как и refreshHistoryFromServer для истории),
// поэтому если админ только что подтвердил новый рекордный заказ — карточка
// обновится сама, без перезапуска приложения.
export async function refreshBiggestDeal() {
    const card = document.getElementById('biggestDealCard');
    if (!card) return;

    const order = await loadBiggestOrder(state.user.id);
    const valueEl = document.getElementById('biggestDealValue');
    const metaEl = document.getElementById('biggestDealMeta');

    if (!order) {
        valueEl.textContent = '—';
        metaEl.textContent = 'Пока нет завершённых сделок';
        return;
    }

    valueEl.textContent = `${Number(order.price_rub).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
    const productLabel = PRODUCT_LABEL[order.product] || order.product;
    const dateLabel = order.created_at
        ? new Date(order.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
        : '';
    metaEl.textContent = dateLabel ? `${productLabel} · ${dateLabel}` : productLabel;
}
