// ===== РАБОТА С ЗАКАЗАМИ =====
import { supabaseClient } from '../lib/supabaseClient.js';

export async function createOrder(userId, product, amount, priceRub, accountData) {
    if (!supabaseClient) return null;
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
            console.error('Ошибка создания заказа:', error);
            return null;
        }
        console.log('Заказ создан:', data);
        return data;
    } catch (e) {
        console.error('Ошибка создания заказа:', e);
        return null;
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

export async function updateOrderStatus(orderId, newStatus) {
    if (!supabaseClient) return false;
    try {
        const { error } = await supabaseClient.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (error) {
            console.error('Ошибка обновления статуса:', error);
            return false;
        }
        console.log(`Заказ ${orderId} обновлён на ${newStatus}`);
        return true;
    } catch (e) {
        console.error('Ошибка обновления статуса:', e);
        return false;
    }
}
