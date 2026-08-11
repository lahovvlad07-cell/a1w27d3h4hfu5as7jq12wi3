// ===== ПОДКЛЮЧЕНИЕ К SUPABASE =====
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

export let supabaseClient = null;

try {
    // `supabase` приходит из глобального CDN-скрипта, подключённого в index.html
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
    console.warn('⚠️ Supabase не загрузился — вход и синхронизация недоступны в этой сессии', e);
}
