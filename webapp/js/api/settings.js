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
export async function saveSettings(settings) {
    if (!supabaseClient) return false;
    try {
        const rows = Object.entries(settings).map(([key, value]) => ({ key, value }));
        const { error } = await supabaseClient
            .from('settings')
            .upsert(rows, { onConflict: 'key' });
        if (error) {
            console.error('Ошибка сохранения настроек:', error);
            return false;
        }
        console.log('Настройки сохранены');
        return true;
    } catch (e) {
        console.error('Ошибка сохранения настроек:', e);
        return false;
    }
}

/** Настройки с подстановкой дефолтов там, где значения ещё нет в базе. */
export function withDefaults(settings) {
    return { ...DEFAULT_SETTINGS, ...settings };
}
