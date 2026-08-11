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

/** Обновляет произвольные поля user_metadata (например, avatar) и
 *  возвращает свежий объект user, чтобы вызывающий код обновил state. */
export async function updateUserMetadata(fields) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { data, error } = await supabaseClient.auth.updateUser({ data: fields });
    return { user: data?.user, error: error?.message || null };
}

/** Привязывает реальный email+пароль к уже открытой сессии — используется
 *  для аккаунтов, созданных через вход по Telegram (у них вместо email
 *  служебный tg-*@telegram.neonkey.local, см. supabase/functions/_shared/telegram.ts).
 *  Если в проекте Supabase включено подтверждение email — Supabase сам
 *  отправит письмо на новый адрес, и email обновится только после перехода
 *  по ссылке из письма (это поведение Supabase, не наш код). */
export async function linkEmailPassword(email, password) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { data, error } = await supabaseClient.auth.updateUser({ email, password });
    return { user: data?.user, error: error?.message || null };
}
