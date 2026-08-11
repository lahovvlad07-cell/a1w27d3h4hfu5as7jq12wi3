// ===== EDGE FUNCTION: ПРИВЯЗКА TELEGRAM К ТЕКУЩЕМУ АККАУНТУ (версия для Supabase Dashboard) =====
// Это тот же код, что в supabase/functions/telegram-link/index.ts, но без
// импорта из ../_shared/telegram.ts — весь код проверки подписи вставлен
// прямо сюда, одним файлом. Так удобно вставлять через веб-редактор
// Supabase Dashboard, который не поддерживает импорт соседних файлов.
// Если деплоишь через `supabase functions deploy` (CLI) — используй вместо
// этого файла обычный index.ts рядом, он чище за счёт общего _shared/.
//
// Используется, когда пользователь уже вошёл (например, по email) и
// нажимает "Привязать Telegram" в профиле. Ожидает заголовок
// Authorization: Bearer <access_token текущей сессии>.
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
// ---------- конец встроенного _shared/telegram.ts ----------

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

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

    const authHeader = req.headers.get('Authorization') || '';
    const accessToken = authHeader.replace('Bearer ', '');
    if (!accessToken) return json({ error: 'Нет активной сессии' }, 401);

    let telegramUser: TelegramWidgetUser;
    try {
        telegramUser = await req.json();
    } catch {
        return json({ error: 'Некорректное тело запроса' }, 400);
    }

    const { ok, reason } = await verifyTelegramAuth(telegramUser, BOT_TOKEN);
    if (!ok) return json({ error: `Подпись Telegram не прошла проверку (${reason})` }, 401);

    // Проверяем, кто стоит за токеном, обычным клиентом с этим access_token.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Сессия недействительна' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Не даём привязать один и тот же Telegram-аккаунт к двум разным пользователям.
    const { data: existing } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const clash = existing?.users?.find(
        (u) => u.id !== userData.user.id && u.user_metadata?.telegram_id === telegramUser.id,
    );
    if (clash) return json({ error: 'Этот Telegram-аккаунт уже привязан к другому профилю' }, 409);

    const { error: updateError } = await admin.auth.admin.updateUserById(userData.user.id, {
        user_metadata: {
            ...userData.user.user_metadata,
            telegram_id: telegramUser.id,
            telegram_username: telegramUser.username || null,
            telegram_first_name: telegramUser.first_name || null,
        },
    });
    if (updateError) return json({ error: updateError.message }, 500);

    return json({ ok: true });
});
