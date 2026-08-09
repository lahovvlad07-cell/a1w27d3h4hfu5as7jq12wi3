// ===== ИСТОРИЯ ЗАКАЗОВ (последние 5) =====
// Своей таблицы заказов на сайте нет (см. README) — оплату и выдачу
// товара ведёт партнёрская платёжная система, поэтому подтверждение
// оплаты сюда не приходит. То, что мы можем честно показать — момент,
// когда пользователь запустил оформление конкретного товара из нашего
// каталога. Храним это прямо в user_metadata аккаунта (без отдельной
// таблицы и RLS), максимум 5 записей, самая старая при добавлении новой
// шестой — удаляется.
import { state } from '../state.js';
import { updateUserMetadata } from './auth.js';

const MAX_ORDERS = 5;

/** Текущая история заказов пользователя (пустой массив, если ещё не покупал). */
export function getOrderHistory() {
    return state.user?.user_metadata?.orders || [];
}

/** Добавить заказ в историю: кладём в начало, обрезаем до MAX_ORDERS. */
export async function addOrderToHistory(item) {
    if (!state.user) return;

    const entry = {
        id: item.id,
        name: item.name,
        icon: item.icon,
        price: item.price,
        date: new Date().toISOString(),
    };

    const current = getOrderHistory();
    const updated = [entry, ...current].slice(0, MAX_ORDERS);

    const { data, error } = await updateUserMetadata({ orders: updated });
    if (!error && data?.user) {
        state.user = data.user; // подтягиваем свежий user_metadata в состояние
    }
    return { error };
}
