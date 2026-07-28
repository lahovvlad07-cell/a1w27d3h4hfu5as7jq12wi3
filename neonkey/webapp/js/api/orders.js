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

/**
 * Заказы конкретного статуса с пагинацией — используется в админке для
 * очереди "в ожидании", чтобы старые необработанные заказы не пропадали
 * из виду, если появляются новые (раньше вся выборка была лимитом 5
 * "самых свежих заказов вообще", и необработанный заказ мог просто
 * вытесниться более новыми, уже обработанными).
 */
export async function loadOrdersByStatus(status, { limit = 5, offset = 0 } = {}) {
    if (!supabaseClient) return { orders: [], total: 0 };
    try {
        const { data, error, count } = await supabaseClient
            .from('orders')
            .select('*', { count: 'exact' })
            .eq('status', status)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) {
            console.error('Ошибка загрузки заказов по статусу:', error);
            return { orders: [], total: 0 };
        }
        return { orders: data || [], total: count || 0 };
    } catch (e) {
        console.error('Ошибка загрузки заказов по статусу:', e);
        return { orders: [], total: 0 };
    }
}

/**
 * Самая крупная сделка пользователя за всё время — используется в профиле.
 * Берём максимум по price_rub среди заказов со статусом "completed" (а не
 * среди всех статусов): "сделка" — это то, что реально прошло, а не просто
 * оформленный, но ещё не подтверждённый или отклонённый заказ. Запрос идёт
 * напрямую в Supabase (а не по локальному списку последних 5 заказов),
 * поэтому результат корректен, даже если рекорд был поставлен давно и
 * выпал из истории.
 */
export async function loadBiggestOrder(userId) {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'completed')
            .order('price_rub', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) {
            console.error('Ошибка загрузки крупнейшей сделки:', error);
            return null;
        }
        return data;
    } catch (e) {
        console.error('Ошибка загрузки крупнейшей сделки:', e);
        return null;
    }
}

/** Последние обработанные заказы (выполненные/отклонённые) — отдельно от очереди ожидания. */
export async function loadProcessedOrders(limit = 5) {
    if (!supabaseClient) return [];
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .in('status', ['completed', 'canceled'])
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) {
            console.error('Ошибка загрузки обработанных заказов:', error);
            return [];
        }
        return data || [];
    } catch (e) {
        console.error('Ошибка загрузки обработанных заказов:', e);
        return [];
    }
}

export async function updateOrderStatus(orderId, newStatus) {
    if (!supabaseClient) return { success: false, error: 'Supabase клиент не инициализирован' };
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId)
            .select();
        if (error) {
            console.error('Ошибка обновления статуса:', error.message, error);
            const hint = (error.code === '42501' || /row-level security|permission|policy|RLS/i.test(error.message || ''))
                ? ' — в Supabase не разрешён UPDATE в таблицу orders для анонимного ключа. Проверь Policies для таблицы orders.'
                : '';
            return { success: false, error: (error.message || 'неизвестная ошибка') + hint };
        }
        // ВАЖНО: Supabase не возвращает error, если RLS-политика UPDATE
        // просто не пропустила ни одной строки (например, есть политика
        // "USING (auth.uid() = user_id)", а анонимный ключ никогда не
        // авторизован через Supabase Auth) — запрос "успешно" ничего не
        // меняет. Поэтому проверяем, что строка реально вернулась.
        if (!data || data.length === 0) {
            return {
                success: false,
                error: 'Заказ не найден или запись заблокирована политикой RLS (UPDATE) для таблицы orders для анонимного ключа — см. README.',
            };
        }
        console.log(`Заказ ${orderId} обновлён на ${newStatus}`);
        return { success: true, error: null };
    } catch (e) {
        console.error('Ошибка обновления статуса:', e);
        return { success: false, error: e.message || String(e) };
    }
}
