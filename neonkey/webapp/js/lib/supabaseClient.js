// ===== ПОДКЛЮЧЕНИЕ К SUPABASE =====
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

export let supabaseClient = null;

try {
    // `supabase` приходит из глобального CDN-скрипта, подключённого в index.html
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase клиент инициализирован');
} catch (e) {
    console.warn('⚠️ Supabase не загрузился — приложение будет работать только в памяти этой сессии', e);
}
