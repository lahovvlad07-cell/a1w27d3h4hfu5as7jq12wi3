// ===== РАБОТА С ПРОФИЛЕМ ПОЛЬЗОВАТЕЛЯ =====
import { supabaseClient } from '../lib/supabaseClient.js';
import { getDefaultData, loadLocalData, saveLocalData, loadLocalConsent, saveLocalConsent } from '../lib/storage.js';

export async function loadProfile(userId) {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase не доступен, используем локальное хранилище');
        const local = loadLocalData();
        if (local) {
            return { ...local, consent: loadLocalConsent() || false };
        }
        saveLocalData({ avatar: '👤', orders: [], balance: 0 });
        saveLocalConsent(false);
        return { avatar: '👤', orders: [], consent: false, balance: 0 };
    }

    try {
        const { data, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (!error && data) {
            console.log('✅ Загружено из Supabase:', data);
            saveLocalData({ avatar: data.avatar, orders: data.orders, balance: data.balance });
            saveLocalConsent(data.consent);
            return data;
        }

        if (error) console.error('❌ Ошибка получения пользователя из Supabase:', error);
        else console.log('ℹ️ Пользователь не найден в Supabase');

        const local = loadLocalData();
        return local
            ? { ...local, consent: loadLocalConsent() || false }
            : { avatar: '👤', orders: [], consent: false, balance: 0 };
    } catch (e) {
        console.warn('⚠️ Ошибка Supabase:', e);
        const local = loadLocalData();
        return local
            ? { ...local, consent: loadLocalConsent() || false }
            : { avatar: '👤', orders: [], consent: false, balance: 0 };
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
    if (supabaseClient) {
        try {
            const { error } = await supabaseClient.from('users').delete().eq('user_id', userId);
            if (error) console.error('Ошибка удаления профиля из Supabase:', error);
            else console.log('Профиль удалён из Supabase');
        } catch (e) {
            console.warn('Ошибка при удалении из Supabase:', e);
        }
    }
    localStorage.removeItem('neonkey_data_local');
    localStorage.removeItem('neonkey_consent_local');
}

export async function updateProfileField(userId, field, value) {
    const local = loadLocalData() || getDefaultData();
    local[field] = value;
    saveLocalData(local);
    if (field === 'consent') saveLocalConsent(value);

    if (loadLocalConsent() && supabaseClient) {
        const fullData = { ...local, consent: loadLocalConsent() };
        await saveProfileToSupabase(userId, fullData);
    }
}
