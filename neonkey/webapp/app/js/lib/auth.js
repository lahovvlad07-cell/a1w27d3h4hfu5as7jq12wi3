// ===== АВТОРИЗАЦИЯ (Supabase Auth: email + пароль, без подтверждения) =====
// ВАЖНО (нужно один раз проверить в самой Supabase, кодом это не включается):
// Authentication → Providers → Email → тумблер «Confirm email» должен
// быть ВЫКЛЮЧЕН. Тогда signUp() ниже сразу возвращает готовую сессию —
// пользователь регистрируется и мгновенно оказывается внутри, без
// писем и кодов. Если тумблер включён, Supabase всё равно потребует
// подтверждения (и signUp() не даст сессию), поэтому это единственная
// настройка, которую правда нужно проверить руками.
import { supabaseClient } from './supabaseClient.js';

/** Регистрация: email + пароль. Если «Confirm email» выключен в Supabase —
 *  сразу возвращает активную сессию (пользователь залогинен). */
export async function signUp(email, password) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { data, error: null };
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
