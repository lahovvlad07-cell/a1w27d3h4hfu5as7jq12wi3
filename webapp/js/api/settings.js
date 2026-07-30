// ===== РАБОТА С НАСТРОЙКАМИ (курсы, цены, минималки) =====
import { supabaseClient } from '../lib/supabaseClient.js';
import { DEFAULT_SETTINGS } from '../config.js';

export async function loadSettings() {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient.from('settings').select('key, value');
        if (error) {
            console.error('Ошибка загрузки настроек:', error);
            return null;
        }
        const settings = {};
        data.forEach(item => { settings[item.key] = parseFloat(item.value); });
        return settings;
    } catch (e) {
        console.warn('Ошибка загрузки настроек:', e);
        return null;
    }
}

/**
 * ИСПРАВЛЕНО (баг с "минималка сбрасывается на 100 ₽"):
 * Раньше здесь был .update().eq('key', key) — то есть UPDATE строки,
 * которая должна была УЖЕ существовать в таблице settings. Если строки
 * с этим key не было (например, "steam_min" никогда не создавался
 * вручную в Supabase), Supabase просто обновлял 0 строк и не считал
 * это ошибкой. В интерфейсе всё выглядело так, будто сохранение прошло
 * успешно, но по факту в базе ничего не менялось — и при следующей
 * загрузке настроек (перезаход / открытие формы заказа) код откатывался
 * на дефолт.
 *
 * upsert с onConflict: 'key' создаёт строку, если её нет, и обновляет,
 * если она уже есть — это и чинит баг.
 */
/**
 * Возвращает { success, error } вместо простого true/false — админ-панели
 * нужен текст причины, а не только факт провала (см. admin.js).
 *
 * ЧАСТАЯ ПРИЧИНА 401 ЗДЕСЬ: в Supabase включён RLS на таблице `settings`,
 * но нет политики INSERT/UPDATE для роли anon. Само чтение (loadSettings)
 * при этом продолжает работать, потому что SELECT обычно разрешён —
 * из-за этого баг выглядит так, будто "запись не работает", хотя на
 * самом деле база в принципе не даёт анонимному ключу писать в эту
 * таблицу. Смотри README, раздел "Важно — безопасность".
 */
export async function saveSettings(settings) {
    if (!supabaseClient) return { success: false, error: 'Supabase клиент не инициализирован' };
    try {
        const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
        const { error } = await supabaseClient
            .from('settings')
            .upsert(rows, { onConflict: 'key' });
        if (error) {
            console.error('Ошибка сохранения настроек:', error.message, error);
            const hint = (error.code === '401' || error.status === 401 || /JWT|permission|policy/i.test(error.message || ''))
                ? ' — похоже, в Supabase не разрешена запись (INSERT/UPDATE) в таблицу settings для анонимного ключа. Проверь Policies для таблицы settings.'
                : '';
            return { success: false, error: (error.message || 'неизвестная ошибка') + hint };
        }
        console.log('Настройки сохранены');
        return { success: true, error: null };
    } catch (e) {
        console.error('Ошибка сохранения настроек:', e);
        return { success: false, error: e.message || String(e) };
    }
}

/** Настройки с подстановкой дефолтов там, где значения ещё нет в базе. */
export function withDefaults(settings) {
    return { ...DEFAULT_SETTINGS, ...settings };
}
