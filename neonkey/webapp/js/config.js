// =========================================================
// NEONKEY — КОНФИГУРАЦИЯ САЙТА
// Этот файл — единственное место, которое стоит трогать при
// смене проекта Supabase, бота или ссылок поддержки.
//
// СИНХРОНИЗАЦИЯ С БУДУЩИМ MINI APP: сайт и mini app должны
// смотреть на один и тот же Supabase-проект (тот же URL и ключ)
// и на один и тот же каталог товаров — тогда аккаунт, вход через
// Telegram и история заказов совпадают в обоих местах "из коробки".
// Рекомендация: в проекте mini app держать копию этого файла и
// каталога (js/data/catalog.js) синхронной с этой — либо, когда
// дойдёт до общего репозитория, вынести оба файла в общий пакет.
// =========================================================

export const SUPABASE_URL = 'https://jbqjvbccstjqaaqrjntx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWp2YmNjc3RqcWFhcXJqbnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE1ODksImV4cCI6MjEwMTg3NzU4OX0.3kvRUMb4oPZAP5Gxn0Y1NNZK0cRpZsTqzFLStJMTw7s';

export const APP_VERSION = '3.0.0';

// Ссылки проекта
export const CHANNEL_URL = 'https://t.me/neonkey_shop';
export const SUPPORT_URL = 'https://t.me/neonkey_shop';
export const SHOP_NAME = 'NeonKey';

// Юзернейм Telegram-бота (без @) — нужен для Telegram Login Widget
// и для кнопки "Открыть в Telegram".
export const BOT_USERNAME = 'NeonKey_Bot';

// Supabase Edge Functions, проверяющие вход через Telegram
// (см. /supabase/functions/telegram-auth, telegram-link).
export const TELEGRAM_AUTH_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/telegram-auth`;
export const TELEGRAM_LINK_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/telegram-link`;
