// ===== ПРОВЕРКА ПОДПИСИ TELEGRAM LOGIN WIDGET =====
// Алгоритм из официальной документации:
// https://core.telegram.org/widgets/login#checking-authorization
//
// secret_key = SHA256(bot_token)
// data_check_string = все поля, кроме hash, отсортированные по ключу,
//                      в формате "key=value", склеенные через "\n"
// hash должен совпасть с HMAC_SHA256(data_check_string, secret_key) в hex

export interface TelegramWidgetUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    auth_date: number;
    hash: string;
}

async function hmacSha256Hex(key: ArrayBuffer, message: string): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(message: string): Promise<ArrayBuffer> {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
}

/** true, если данные реально пришли от Telegram для нашего бота и не старше maxAgeSeconds. */
export async function verifyTelegramAuth(
    user: TelegramWidgetUser,
    botToken: string,
    maxAgeSeconds = 86400,
): Promise<{ ok: boolean; reason?: string }> {
    const { hash, ...rest } = user as Record<string, unknown>;
    if (!hash) return { ok: false, reason: 'no hash' };

    const dataCheckString = Object.keys(rest)
        .filter((k) => rest[k] !== undefined && rest[k] !== null)
        .sort()
        .map((k) => `${k}=${rest[k]}`)
        .join('\n');

    const secretKey = await sha256(botToken);
    const expectedHash = await hmacSha256Hex(secretKey, dataCheckString);

    if (expectedHash !== hash) return { ok: false, reason: 'bad hash' };

    const ageSeconds = Math.floor(Date.now() / 1000) - Number(user.auth_date);
    if (ageSeconds > maxAgeSeconds) return { ok: false, reason: 'expired' };

    return { ok: true };
}

/** Детерминированный "служебный" email для аккаунта, у которого пока нет
 *  настоящей почты — так им можно управлять через обычный Supabase Auth,
 *  не заводя отдельную таблицу telegram_users. Пользователь этот email
 *  нигде не видит, пока сам не привяжет настоящий (см. profileView.js). */
export function telegramPlaceholderEmail(telegramId: number): string {
    return `tg-${telegramId}@telegram.neonkey.local`;
}
