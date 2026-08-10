// ===== ВХОД / ПРИВЯЗКА ЧЕРЕЗ TELEGRAM (Telegram Login Widget) =====
// Официальный виджет Telegram (https://core.telegram.org/widgets/login)
// для входа через Telegram НЕ из мини-аппа, а с обычного сайта. Проверка
// подписи (hash) обязательно должна проходить на сервере — токен бота
// нельзя доверять браузеру, поэтому проверка вынесена в Supabase Edge
// Function (см. supabase/functions/telegram-auth и telegram-link).
//
// ЧТО НУЖНО НАСТРОИТЬ ПЕРЕД ИСПОЛЬЗОВАНИЕМ (см. README → "Telegram-вход"):
//  1. У @BotFather: /setdomain — указать домен, на котором висит сайт.
//  2. Задеплоить supabase/functions/telegram-auth и telegram-link,
//     прописать секрет BOT_TOKEN в настройках функций.
//  3. Указать правильный BOT_USERNAME в webapp/app/js/config.js.
import { BOT_USERNAME, SUPABASE_ANON_KEY, TELEGRAM_AUTH_FUNCTION_URL, TELEGRAM_LINK_FUNCTION_URL } from '../config.js';
import { supabaseClient } from './supabaseClient.js';

/** Рисует официальный Telegram Login Widget внутрь контейнера с данным id.
 *  onAuth(telegramUser) вызовется, когда пользователь подтвердит вход в Telegram. */
export function renderTelegramLoginWidget(containerId, { onAuth, buttonSize = 'large', requestAccess = false } = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Глобальный колбэк, который дёргает сам скрипт виджета Telegram.
    const callbackName = `__tgLoginCallback_${containerId}`;
    window[callbackName] = (user) => onAuth?.(user);

    container.innerHTML = '';
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', BOT_USERNAME);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', `${callbackName}(user)`);
    if (requestAccess) script.setAttribute('data-request-access', 'write');
    container.appendChild(script);
}

/** Вход/регистрация по данным из виджета: проверяет подпись на сервере,
 *  создаёт (или находит) аккаунт и открывает Supabase-сессию в браузере. */
export async function signInWithTelegram(telegramUser) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    try {
        const res = await fetch(TELEGRAM_AUTH_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Функция telegram-auth вызывается ДО того, как у пользователя
                // появится своя сессия — поэтому шлём анонимный ключ проекта,
                // а не токен пользователя (его пока просто нет). Без этого
                // заголовка шлюз Supabase отклоняет запрос ещё до нашего кода.
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(telegramUser),
        });
        const payload = await res.json();
        if (!res.ok) return { error: payload?.error || 'Не удалось войти через Telegram' };

        const { email, token_hash } = payload;
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email,
            token: token_hash,
            type: 'magiclink',
        });
        if (error) return { error: error.message };
        return { data, error: null };
    } catch (e) {
        return { error: 'Не удалось связаться с сервером входа через Telegram' };
    }
}

/** Привязка Telegram к уже вошедшему аккаунту (например, зарегистрированному по email). */
export async function linkTelegramToCurrentUser(telegramUser) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) return { error: 'Нужно быть в системе, чтобы привязать Telegram' };

    try {
        const res = await fetch(TELEGRAM_LINK_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(telegramUser),
        });
        const payload = await res.json();
        if (!res.ok) return { error: payload?.error || 'Не удалось привязать Telegram' };
        return { data: payload, error: null };
    } catch (e) {
        return { error: 'Не удалось связаться с сервером привязки Telegram' };
    }
}
