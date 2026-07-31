// ===== РАБОТА С ПРОФИЛЕМ ПОЛЬЗОВАТЕЛЯ =====
// Единственный источник правды — Supabase (таблица users). Локального
// кэша/резервной копии в localStorage больше нет: если Supabase
// недоступен, приложение работает только в рамках текущей сессии (в
// памяти, state.appData), ничего не сохраняя на диск браузера — это
// осознанный компромисс, чтобы данные разных Telegram-аккаунтов не
// могли перепутаться на одном устройстве.
import { supabaseClient } from '../lib/supabaseClient.js';
import { getDefaultData } from '../lib/storage.js';

export async function loadProfile(userId) {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase недоступен — работаем только в памяти этой сессии, без сохранения');
        return { ...getDefaultData(), consent: false };
    }

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (!error && data) {
            console.log('✅ Загружено из Supabase:', data);
            return data;
        }

        if (error) console.error('❌ Ошибка получения пользователя из Supabase:', error);
        else console.log('ℹ️ Пользователь не найден в Supabase');

        return { ...getDefaultData(), consent: false };
    } catch (e) {
        console.warn('⚠️ Ошибка Supabase:', e);
        return { ...getDefaultData(), consent: false };
    }
}

export async function saveProfileToSupabase(userId, data) {
    if (!supabaseClient) return false;
    try {
        const { data: existing, error: fetchError } = await supabaseClient
            .from('users')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError) {
            console.error('Ошибка проверки существования пользователя:', fetchError);
            return false;
        }

        const payload = {
            avatar: data.avatar,
            orders: data.orders,
            consent: data.consent,
            balance: data.balance || 0,
        };

        if (existing) {
            const { error } = await supabaseClient.from('users').update(payload).eq('user_id', userId);
            if (error) {
                console.error('Ошибка обновления в Supabase:', error);
                return false;
            }
            console.log('Данные обновлены в Supabase');
        } else {
            const { error } = await supabaseClient.from('users').insert([{ user_id: userId, ...payload }]);
            if (error) {
                console.error('Ошибка создания в Supabase:', error);
                return false;
            }
            console.log('Пользователь создан в Supabase');
        }
        return true;
    } catch (e) {
        console.error('Ошибка при сохранении в Supabase:', e);
        return false;
    }
}

export async function deleteProfile(userId) {
    if (!supabaseClient) return;
    try {
        const { error } = await supabaseClient.from('users').delete().eq('user_id', userId);
        if (error) console.error('Ошибка удаления профиля из Supabase:', error);
        else console.log('Профиль удалён из Supabase');
    } catch (e) {
        console.warn('Ошибка при удалении из Supabase:', e);
    }
}

/** Обновляет одно поле профиля в Supabase, отталкиваясь от текущих данных в памяти (state.appData). */
export async function updateProfileField(userId, currentData, field, value) {
    return saveProfileToSupabase(userId, { ...currentData, [field]: value });
}
