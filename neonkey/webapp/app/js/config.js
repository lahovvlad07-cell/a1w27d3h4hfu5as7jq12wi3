// ===== КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ =====
// ВНИМАНИЕ: anon key Supabase предназначен для использования в браузере,
// это нормально, что он "виден" в коде. Приложение больше не хранит
// пользовательские данные в собственных таблицах (users/orders/settings) —
// единственное, что используется из Supabase, это Supabase Auth
// (email + пароль + код подтверждения), поэтому отдельные RLS-политики
// на таблицы теперь не нужны вообще.
export const SUPABASE_URL = 'https://jbqjvbccstjqaaqrjntx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWp2YmNjc3RqcWFhcXJqbnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE1ODksImV4cCI6MjEwMTg3NzU4OX0.3kvRUMb4oPZAP5Gxn0Y1NNZK0cRpZsTqzFLStJMTw7s';

export const APP_VERSION = '2.1.0';

// Ссылка на канал проекта и поддержку.
export const CHANNEL_URL = 'https://t.me/neonkey_shop';
export const SUPPORT_URL = 'https://t.me/neonkey_shop';

// Название сервиса — используется в текстах (Оферта/Политика/письма).
export const SHOP_NAME = 'NeonKey';

// Юзернейм Telegram-бота (без @) — нужен для кнопки "Войти через
// Telegram" на сайте (Telegram Login Widget) и для ссылки на мини-апп.
export const BOT_USERNAME = 'NeonKey_Bot';

// URL Edge Function, которая проверяет вход через Telegram и создаёт/
// находит аккаунт (см. supabase/functions/telegram-auth). ВАЖНО: у
// Supabase Edge Functions именно такой формат адреса —
// https://<project-ref>.supabase.co/functions/v1/<имя-функции>
// (НЕ <project-ref>.functions.supabase.co — такого домена не существует,
// из-за этого раньше был "нет связи с сервером").
export const TELEGRAM_AUTH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/telegram-auth`;
export const TELEGRAM_LINK_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/telegram-link`;

export const AVATAR_EMOJIS = [
    '🚀', '💎', '⚡', '🔥',
    '🌟', '🎮', '🕹️', '💰',
    '💳', '🌐', '🔮', '🧩',
    '🎯', '🏆', '🥇', '🪙'
];
