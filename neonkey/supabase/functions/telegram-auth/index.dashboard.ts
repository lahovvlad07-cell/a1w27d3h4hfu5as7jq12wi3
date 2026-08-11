// ===== EDGE FUNCTION: ВХОД ЧЕРЕЗ TELEGRAM (версия для Supabase Dashboard) =====
// Это тот же код, что в supabase/functions/telegram-auth/index.ts, но без
// импорта из ../_shared/telegram.ts — весь код проверки подписи вставлен
// прямо сюда, одним файлом. Так удобно вставлять через веб-редактор
// Supabase Dashboard, который не поддерживает импорт соседних файлов.
// Если деплоишь через `supabase functions deploy` (CLI) — используй вместо
// этого файла обычный index.ts рядом, он чище за счёт общего _shared/.
//
// ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (задать в Supabase → Edge Functions → Secrets):
//   BOT_TOKEN                 — токен бота от @BotFather (тот же, что в bot/config.py)
//   SUPABASE_URL               — обычно подставляется автоматически
//   SUPABASE_SERVICE_ROLE_KEY  — service role key проекта (Settings → API)
import { createClient } from 'npm:@supabase/supabase-js@2';

// ---------- Проверка подписи Telegram Login Widget ----------
// Алгоритм из официальной документации:
// https://core.telegram.org/widgets/login#checking-authorization
interface TelegramWidgetUser {
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

async function verifyTelegramAuth(
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

// ВАЖНО про домен: зона .local зарезервирована под mDNS и Supabase Auth
// считает её недоставляемой — это ломает "Привязать email" в профиле у
// аккаунтов, созданных через Telegram (см. подробный комментарий в
// _shared/telegram.ts). Если есть свой домен — подставь его сюда.
function telegramPlaceholderEmail(telegramId: number): string {
    return `tg-${telegramId}@telegram.neonkey.app`; // TODO: замени на telegram.<твой домен>, если он есть
}
// ---------- конец встроенного _shared/telegram.ts ----------

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    let telegramUser: TelegramWidgetUser;
    try {
        telegramUser = await req.json();
    } catch {
        return json({ error: 'Некорректное тело запроса' }, 400);
    }

    const { ok, reason } = await verifyTelegramAuth(telegramUser, BOT_TOKEN);
    if (!ok) return json({ error: `Подпись Telegram не прошла проверку (${reason})` }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const email = telegramPlaceholderEmail(telegramUser.id);

    // Ищем существующего пользователя по служебному email. Для реальных
    // масштабов лучше завести отдельную таблицу telegram_id -> user_id,
    // но для старта хватает и этого (аккаунтов немного, listUsers быстрый).
    const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
    let user = existing?.users?.find((u) => u.email === email);

    const profileFields = {
        telegram_id: telegramUser.id,
        telegram_username: telegramUser.username || null,
        telegram_first_name: telegramUser.first_name || null,
        avatar_url: telegramUser.photo_url || null,
    };

    if (!user) {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: profileFields,
        });
        if (createError) return json({ error: createError.message }, 500);
        user = created.user;
    } else {
        await admin.auth.admin.updateUserById(user.id, {
            user_metadata: { ...user.user_metadata, ...profileFields },
        });
    }

    // Генерируем magic-link и достаём из него одноразовый токен — сам
    // ссылкой не пользуемся (она ведёт на дефолтный redirect Supabase),
    // фронтенд подтвердит вход через verifyOtp() этим токеном напрямую.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
    });
    if (linkError) return json({ error: linkError.message }, 500);

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) return json({ error: 'Не удалось создать сессию' }, 500);

    return json({ email, token_hash: tokenHash });
});
