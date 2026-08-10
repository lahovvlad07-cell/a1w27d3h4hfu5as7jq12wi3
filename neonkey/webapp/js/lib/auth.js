// ===== ВХОД ПО EMAIL/ПАРОЛЮ =====
// Второй способ входа, для тех, кто не хочет привязывать Telegram
// прямо сейчас. Аккаунт всё равно один и тот же в Supabase, поэтому
// если человек позже нажмёт "Войти через Telegram" с тем же email —
// Supabase свяжет это как один и тот же профиль (см. supabase/functions/telegram-link).
import { supabaseClient } from './supabaseClient.js';

export async function signUpWithEmail(email, password) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    return { data, error: error?.message || null };
}

export async function signInWithEmail(email, password) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    return { data, error: error?.message || null };
}

export async function signOut() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
}
