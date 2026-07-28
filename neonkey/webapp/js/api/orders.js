// ===== РАБОТА С ЗАКАЗАМИ =====
import { supabaseClient } from '../lib/supabaseClient.js';

/**
 * Возвращает { order, error } вместо простого объекта/null — раньше
 * при неудаче было видно только общее "Не удалось создать заказ",
 * а настоящую причину приходилось искать в консоли браузера (F12).
 *
 * САМАЯ ЧАСТАЯ ПРИЧИНА: RLS (Row Level Security) включён в Supabase на
 * таблице `orders`, но нет политики INSERT для роли anon — то есть
 * анонимному ключу в принципе запрещено писать в эту таблицу. Заказ
 * при этом не создаётся вообще, деньги с локального баланса возвращаются
 * обратно (см. orderModal.js), это не потеря средств — просто нужно
 * один раз настроить Policies (см. README, раздел "Важно — безопасность").
 */
export async function createOrder(userId, product, amount, priceRub, accountData) {
    if (!supabaseClient) return { order: null, error: 'Supabase клиент не инициализирован' };
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .insert([{
                user_id: userId,
                product,
                amount,
                price_rub: priceRub,
                account_data: accountData || '',
                status: 'pending',
            }])
            .select()
            .single();
        if (error) {
            console.error('Ошибка создания заказа:', error.message, error);
            let hint = '';
            if (error.code === '42501' || /row-level security|permission|policy|RLS/i.test(error.message || '')) {
                hint = ' — в Supabase не разрешена запись (INSERT) в таблицу orders для анонимного ключа. Проверь Policies для таблицы orders.';
            } else if (/could not find the .* column/i.test(error.message || '')) {
                hint = ' — в таблице orders в Supabase не хватает этой колонки. См. README, раздел про ошибку "Could not find column".';
            }
            return { order: null, error: (error.message || 'неизвестная ошибка') + hint };
        }
        console.log('Заказ создан:', data);
        return { order: data, error: null };
    } catch (e) {
        console.error('Ошибка создания заказа:', e);
        return { order: null, error: e.message || String(e) };
    }
}

export async function loadOrders(limit = 5) {
    if (!supabaseClient) return [];
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) {
            console.error('Ошибка загрузки заказов:', error);
            return [];
        }
        return data;
    } catch (e) {
        console.error('Ошибка загрузки заказов:', e);
        return [];
    }
}

/**
 * Заказы конкретного пользователя — используется в профиле, чтобы
 * подтягивать актуальный статус (например, если админ отметил заказ
 * как "выполнен", пока приложение было закрыто). Локальная копия в
 * appData.orders используется только для мгновенного отображения
 * сразу после покупки, пока не пришёл ответ от Supabase.
 */
export async function loadUserOrders(userId, limit = 5) {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) {
            console.error('Ошибка загрузки заказов пользователя:', error);
            return null;
        }
        return data;
    } catch (e) {
        console.error('Ошибка загрузки заказов пользователя:', e);
        return null;
    }
}

export async function updateOrderStatus(orderId, newStatus) {
    if (!supabaseClient) return { success: false, error: 'Supabase клиент не инициализирован' };
    try {
        const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (error) {
            console.error('Ошибка обновления статуса:', error.message, error);
            return { success: false, error: error.message || 'неизвестная ошибка' };
        }
        console.log(`Заказ ${orderId} обновлён на ${newStatus}`);
        return { success: true, error: null };
    } catch (e) {
        console.error('Ошибка обновления статуса:', e);
        return { success: false, error: e.message || String(e) };
    }
}
