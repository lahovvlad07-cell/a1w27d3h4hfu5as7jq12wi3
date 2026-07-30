// ===== ИСТОРИЯ ЗАКАЗОВ (ПРОФИЛЬ) =====
import { state } from '../state.js';
import { loadUserOrders } from '../api/orders.js';
import { saveLocalData } from '../lib/storage.js';

const STATUS_LABELS = {
    pending: 'В обработке',
    completed: 'Выполнен',
    canceled: 'Отклонён',
};

/**
 * Приводит запись заказа (старого локального формата без статуса,
 * либо новой — напрямую из таблицы orders в Supabase) к единому виду
 * для отрисовки. `index` — позиция в исходном массиве, используется
 * как запасной ключ сортировки для старых записей без даты.
 */
function normalizeOrder(order, index) {
    if (order.product !== undefined) {
        // Новый формат — объект прямо из Supabase (или сохранённый из него)
        const isSteam = order.product === 'steam';
        return {
            id: order.id,
            name: isSteam ? 'Пополнение Steam' : 'Telegram Stars',
            icon: isSteam ? '🎮' : '⭐',
            date: order.created_at ? new Date(order.created_at).toLocaleString('ru-RU') : (order.date || ''),
            amountText: `${order.amount} ${isSteam ? '₽' : 'Stars'}`,
            status: order.status || 'pending',
            // created_at — настоящий timestamp в мс, всегда больше любого
            // индекса массива, так что сравнение с записями без даты ниже
            // остаётся корректным.
            sortTime: order.created_at ? new Date(order.created_at).getTime() : index,
        };
    }
    // Старый локальный формат (заказы, созданные до этого обновления) —
    // статуса у них никогда не было, показываем как выполненные, чтобы
    // не вводить пользователя в заблуждение бесконечным "в обработке".
    const isSteam = (order.productName || '').includes('Steam');
    return {
        id: null,
        name: order.productName || 'Заказ',
        icon: isSteam ? '🎮' : (order.productName || '').includes('Stars') ? '⭐' : '',
        date: order.date || '',
        amountText: order.amount || '',
        status: 'completed',
        // Даты в старом формате не парсятся надёжно — используем позицию
        // в массиве (порядок добавления), чтобы более новые записи всё
        // равно оказались выше.
        sortTime: index,
    };
}

export function renderHistory() {
    const historyList = document.getElementById('historyList');
    const historyEmpty = document.getElementById('historyEmpty');
    const orders = state.appData.orders || [];

    if (orders.length === 0) {
        historyList.innerHTML = '';
        historyEmpty.style.display = 'flex';
        return;
    }

    historyEmpty.style.display = 'none';
    // Явная сортировка "сначала новые" вместо слепого .reverse() — тот
    // предполагал, что массив всегда идёт от старых к новым, но данные
    // из Supabase (loadUserOrders) приходят уже отсортированными по
    // убыванию даты, так что .reverse() переворачивал их не в ту сторону.
    const top5 = orders
        .map((order, i) => normalizeOrder(order, i))
        .sort((a, b) => b.sortTime - a.sortTime)
        .slice(0, 5);
    historyList.innerHTML = top5.map((order) => `
        <div class="history-item">
            <div class="history-item-top">
                <span class="product-name">
                    ${order.icon ? `<span class="product-icon-small">${order.icon}</span>` : ''}${order.name}
                </span>
                <span class="status-pill ${order.status}">${STATUS_LABELS[order.status] || order.status}</span>
            </div>
            <div class="history-item-bottom">
                <span class="order-date">${order.date}</span>
                <span class="order-amount">${order.amountText}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Подтягивает актуальные заказы (и их статусы) из Supabase и обновляет
 * и state, и отображение. Вызывается при запуске приложения и при
 * каждом открытии вкладки "Профиль", чтобы статус "В обработке" вовремя
 * сменился на "Выполнен"/"Отклонён", если админ уже обработал заказ.
 */
export async function refreshHistoryFromServer() {
    if (!state.user) return;
    const serverOrders = await loadUserOrders(state.user.id, 5);
    if (!serverOrders) return; // Supabase недоступен — оставляем локальные данные как есть

    state.appData.orders = serverOrders;
    saveLocalData({
        avatar: state.appData.avatar,
        orders: state.appData.orders,
        balance: state.appData.balance,
    });
    renderHistory();
}
