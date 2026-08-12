// ===== EDGE FUNCTION: ПРИВЯЗКА EMAIL К ТЕКУЩЕМУ АККАУНТУ (версия для Supabase Dashboard) =====
// Это тот же код, что в supabase/functions/link-email/index.ts. У этой
// функции нет импортов из ../_shared, так что оба файла идентичны —
// этот просто лежит рядом для единообразия с остальными функциями
// проекта (см. telegram-auth, telegram-link) и чтобы было очевидно,
// какой файл вставлять в веб-редактор Supabase Dashboard.
//
// Почему это Edge Function, а не просто supabaseClient.auth.updateUser()
// на клиенте: у Supabase по умолчанию включена "Secure email change" —
// смена email требует подтверждения ПО ССЫЛКЕ ИЗ ПИСЬМА, отправленного
// не только на новый, но и на СТАРЫЙ адрес. Старый адрес у таких
// аккаунтов — служебный и никогда не существовал как настоящий почтовый
// ящик, поэтому Supabase не может подтвердить его валидность/доставить
// туда письмо и вся операция падает с ошибкой вида:
//   Email address "tg-6048486427@telegram.neonkey.app" is invalid
//
// Обходим это через service-role admin API: он меняет email/пароль
// напрямую в auth.users, без отправки письма на старый (служебный)
// адрес. Ставим email_confirm: true, чтобы новый адрес сразу считался
// подтверждённым.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Держи синхронно с TELEGRAM_PLACEHOLDER_EMAIL_DOMAIN в webapp/js/config.js
// и telegramPlaceholderEmail() в ../_shared/telegram.ts.
const PLACEHOLDER_DOMAIN = 'telegram.neonkey.app';

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

    let body: { email?: string; password?: string };
    try {
        body = await req.json();
    } catch {
        return json({ error: 'Некорректное тело запроса' }, 400);
    }

    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    if (!email || !email.includes('@')) return json({ error: 'Некорректный email' }, 400);
    if (email.endsWith(`@${PLACEHOLDER_DOMAIN}`)) {
        return json({ error: 'Этот email зарезервирован под служебные Telegram-аккаунты' }, 400);
    }
    if (password.length < 6) return json({ error: 'Пароль должен быть не короче 6 символов' }, 400);

    // Кто стоит за токеном — обычным клиентом с этим access_token.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Сессия недействительна' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(
        userData.user.id,
        { email, password, email_confirm: true },
    );
    if (updateError) {
        // Самая частая причина — email уже занят другим аккаунтом.
        const msg = /already.*registered|already.*exists/i.test(updateError.message)
            ? 'Этот email уже привязан к другому аккаунту'
            : updateError.message;
        return json({ error: msg }, 400);
    }

    return json({ user: updated.user });
});
