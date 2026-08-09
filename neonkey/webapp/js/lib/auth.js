// ===== АВТОРИЗАЦИЯ (Supabase Auth: email + пароль + код подтверждения) =====
// ВАЖНО (нужно один раз настроить в самой Supabase, кодом это не включается):
// По умолчанию Supabase после регистрации шлёт письмо со ссылкой
// ("Confirm your signup"), а не 6-значным кодом. Чтобы вместо ссылки
// приходил именно код (как просили), зайди в Supabase → Authentication →
// Email Templates → "Confirm signup" и замени ссылку {{ .ConfirmationURL }}
// в тексте письма на переменную {{ .Token }} — это и есть 6-значный код.
// Он проверяется функцией verifyEmailOtp() ниже (auth.verifyOtp с типом
// 'signup'). Без этой замены в шаблоне письмо всё ещё будет со ссылкой.
import { supabaseClient } from './supabaseClient.js';

/** Регистрация: отправляет письмо с кодом подтверждения на email. */
export async function signUp(email, password) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { data, error: null };
}

/** Подтверждение регистрации 6-значным кодом из письма. */
export async function verifyEmailOtp(email, token) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { data, error } = await supabaseClient.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) return { error: error.message };
    return { data, error: null };
}

/** Повторная отправка кода подтверждения (если письмо не пришло / код истёк). */
export async function resendSignupCode(email) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { error } = await supabaseClient.auth.resend({ type: 'signup', email });
    if (error) return { error: error.message };
    return { error: null };
}

/** Вход по email + паролю. */
export async function signInWithPassword(email, password) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { data, error: null };
}

/** Запрос на восстановление пароля — Supabase пришлёт ссылку для сброса. */
export async function requestPasswordReset(email) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
    if (error) return { error: error.message };
    return { error: null };
}

export async function signOut() {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
}

/** Текущая сессия (если пользователь уже входил раньше — Supabase сам её восстановит). */
export async function getSession() {
    if (!supabaseClient) return null;
    const { data } = await supabaseClient.auth.getSession();
    return data.session || null;
}

/** Сохранение произвольных полей профиля (например, аватар) прямо в Supabase Auth,
 *  без отдельной таблицы users — user_metadata привязан к аккаунту "из коробки". */
export async function updateUserMetadata(fields) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { data, error } = await supabaseClient.auth.updateUser({ data: fields });
    if (error) return { error: error.message };
    return { data, error: null };
}
