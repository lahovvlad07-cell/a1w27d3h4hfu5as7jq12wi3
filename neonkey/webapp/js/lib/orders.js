// ===== ИСТОРИЯ ЗАКАЗОВ (последние 5, для будущей синхронизации) =====
// Сайт сейчас не показывает историю заказов сам (личный кабинет будет
// жить в Telegram-приложении), но каждый переход к оплате всё равно
// тихо сохраняется в user_metadata аккаунта — так mini app, когда
// появится, сможет прочитать те же заказы без отдельной таблицы и
// без миграции данных. Формат записи специально простой и стабильный —
// держите его таким же в mini app.
import { state } from '../state.js';
import { supabaseClient } from './supabaseClient.js';

const MAX_ORDERS = 5;

export function getOrderHistory() {
    return state.user?.user_metadata?.orders || [];
}

export async function addOrderToHistory(item) {
    if (!state.user || !supabaseClient) return;

    const entry = {
        id: item.id,
        name: item.name,
        icon: item.icon,
        price: item.price,
        date: new Date().toISOString(),
    };

    const updated = [entry, ...getOrderHistory()].slice(0, MAX_ORDERS);
    const { data, error } = await supabaseClient.auth.updateUser({ data: { orders: updated } });
    if (!error && data?.user) state.user = data.user;
    return { error };
}
