// ===== EDGE FUNCTION: ВХОД ЧЕРЕЗ TELEGRAM =====
// Принимает данные из Telegram Login Widget (см. webapp/app/js/lib/telegramAuth.js),
// проверяет подпись, создаёт аккаунт при первом входе (или находит
// существующий по telegram_id) и возвращает одноразовый magiclink-токен,
// которым фронтенд сразу открывает сессию через supabase.auth.verifyOtp().
//
// ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ (задать в Supabase → Edge Functions → Secrets):
//   BOT_TOKEN            — токен бота от @BotFather (тот же, что в bot/config.py)
//   SUPABASE_URL          — обычно подставляется автоматически
//   SUPABASE_SERVICE_ROLE_KEY — service role key проекта (Settings → API)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyTelegramAuth, telegramPlaceholderEmail, type TelegramWidgetUser } from '../_shared/telegram.ts';

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
