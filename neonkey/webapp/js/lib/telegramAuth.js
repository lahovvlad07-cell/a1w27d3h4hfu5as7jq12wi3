// ===== ВХОД ЧЕРЕЗ TELEGRAM (Telegram Login Widget, обычный сайт) =====
// Официальный виджет Telegram (https://core.telegram.org/widgets/login).
// Проверка подписи (hash) обязательно должна проходить на сервере —
// токен бота нельзя доверять браузеру, поэтому проверка вынесена в
// Supabase Edge Function (см. /supabase/functions/telegram-auth).
//
// ЧТО НАСТРОИТЬ ПЕРЕД ИСПОЛЬЗОВАНИЕМ (см. README → «Telegram-вход»):
//  1. У @BotFather: /setdomain — указать домен, на котором висит сайт.
//  2. Задеплоить supabase/functions/telegram-auth, прописать секрет
//     BOT_TOKEN в настройках функции.
//  3. Проверить BOT_USERNAME в js/config.js.
import { BOT_USERNAME, SUPABASE_ANON_KEY, TELEGRAM_AUTH_FUNCTION_URL, TELEGRAM_LINK_FUNCTION_URL, TELEGRAM_PLACEHOLDER_EMAIL_DOMAIN } from '../config.js';
import { supabaseClient } from './supabaseClient.js';

/** true, если это служебный email, который сам сгенерировался при входе
 *  через Telegram (см. telegramPlaceholderEmail() в
 *  supabase/functions/_shared/telegram.ts) — пользователь его не задавал,
 *  поэтому нигде в интерфейсе показывать его как "привязанный email"
 *  нельзя. Единственное место в webapp, где знаем формат этого домена —
 *  дальше везде, где нужно проверить/скрыть такой email, импортируй эту
 *  функцию, а не сравнивай со строкой заново (см. историю бага в
 *  supabase/fix_telegram_placeholder_emails.sql — там уже разъезжались
 *  два хардкода одного и того же домена). */
export function isPlaceholderEmail(email) {
    return Boolean(email) && email.endsWith(`@${TELEGRAM_PLACEHOLDER_EMAIL_DOMAIN}`);
}

/** Возвращает email пользователя, только если это настоящий, самим
 *  пользователем привязанный адрес (не служебный tg-*@...). */
export function realEmail(user) {
    const email = user?.email;
    if (!email || isPlaceholderEmail(email)) return null;
    return email;
}

/** Рисует официальный Telegram Login Widget внутрь контейнера с данным id.
 *  onAuth(telegramUser) вызовется, когда пользователь подтвердит вход. */
export function renderTelegramLoginWidget(containerId, { onAuth, buttonSize = 'large' } = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

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
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(telegramUser),
        });
        const payload = await res.json();
        if (!res.ok) return { error: payload?.error || 'Не удалось войти через Telegram' };

        const { token_hash } = payload;
        const { data, error } = await supabaseClient.auth.verifyOtp({
            token_hash,
            type: 'magiclink',
        });
        if (error) return { error: error.message };
        return { data, error: null };
    } catch (e) {
        return { error: 'сервер не отвечает — похоже, Edge Function telegram-auth ещё не задеплоена (см. README → «Вход через Telegram и привязка аккаунта»)' };
    }
}

/** Привязывает Telegram к уже открытому аккаунту (например, вошедшему по
 *  email) — используется кнопкой "Привязать" в профиле. Вызывает Edge
 *  Function telegram-link с access_token текущей сессии в заголовке. */
export async function linkTelegramAccount(telegramUser) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) return { error: 'Нет активной сессии' };

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
        return { error: null };
    } catch (e) {
        return { error: 'сервер не отвечает — похоже, Edge Function telegram-link ещё не задеплоена (см. README → «Вход через Telegram и привязка аккаунта»)' };
    }
}
