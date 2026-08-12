// ===== ВХОД ПО EMAIL/ПАРОЛЮ =====
// Второй способ входа, для тех, кто не хочет привязывать Telegram
// прямо сейчас. Аккаунт всё равно один и тот же в Supabase, поэтому
// если человек позже нажмёт "Войти через Telegram" с тем же email —
// Supabase свяжет это как один и тот же профиль (см. supabase/functions/telegram-link).
import { supabaseClient } from './supabaseClient.js';
import { LINK_EMAIL_FUNCTION_URL, SUPABASE_ANON_KEY } from '../config.js';

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
 *  служебный tg-*@telegram.neonkey.app, см. supabase/functions/_shared/telegram.ts).
 *
 *  ВАЖНО: это НЕ supabaseClient.auth.updateUser() напрямую, а вызов
 *  Edge Function link-email через service-role admin API. Прямой
 *  self-service updateUser() тут не работает: у Supabase по умолчанию
 *  включена "Secure email change", которая шлёт письмо-подтверждение
 *  не только на новый, но и на СТАРЫЙ адрес — а старый адрес здесь
 *  служебный и никогда не был настоящим почтовым ящиком, из-за чего
 *  вся операция падает с ошибкой вида
 *  `Email address "tg-...@telegram.neonkey.app" is invalid`.
 *  См. supabase/functions/link-email/index.ts. */
export async function linkEmailPassword(email, password) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return { error: 'Нет активной сессии' };

        const res = await fetch(LINK_EMAIL_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ email, password }),
        });
        const payload = await res.json();
        if (!res.ok) return { error: payload?.error || 'Не удалось привязать email' };

        // Локальная сессия ещё хранит старые данные пользователя — обновляем её,
        // чтобы state.user (и всё, что от него зависит) увидело новый email сразу.
        await supabaseClient.auth.refreshSession();
        const { data: refreshed } = await supabaseClient.auth.getUser();
        return { user: refreshed?.user || payload?.user, error: null };
    } catch (e) {
        return { error: 'сервер не отвечает — похоже, Edge Function link-email ещё не задеплоена (см. README → «Вход через Telegram и привязка аккаунта»)' };
    }
}
