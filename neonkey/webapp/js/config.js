// ===== КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ =====
// ВНИМАНИЕ: anon key Supabase предназначен для использования в браузере,
// это нормально, что он "виден" в коде. Приложение больше не хранит
// пользовательские данные в собственных таблицах (users/orders/settings) —
// единственное, что используется из Supabase, это Supabase Auth
// (email + пароль + код подтверждения), поэтому отдельные RLS-политики
// на таблицы теперь не нужны вообще.
export const SUPABASE_URL = 'https://jbqjvbccstjqaaqrjntx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpicWp2YmNjc3RqcWFhcXJqbnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDE1ODksImV4cCI6MjEwMTg3NzU4OX0.3kvRUMb4oPZAP5Gxn0Y1NNZK0cRpZsTqzFLStJMTw7s';

export const APP_VERSION = '2.0.0';

// Ссылка на канал проекта и поддержку.
export const CHANNEL_URL = 'https://t.me/neonkey_shop';
export const SUPPORT_URL = 'https://t.me/neonkey_shop';

// Название сервиса — используется в текстах (Оферта/Политика/письма).
export const SHOP_NAME = 'NeonKey';

// Ник/ID продавца на Digiseller — показывается в разделе "Информация",
// чтобы покупатель мог свериться, что оплата действительно уходит
// официальному партнёру Digiseller/plati.market. Заполни своими данными.
export const DIGISELLER_SELLER_NAME = 'NeonKey (партнёр Digiseller / plati.market)';

export const AVATAR_EMOJIS = [
    '🚀', '💎', '⚡', '🔥',
    '🌟', '🎮', '🕹️', '💰',
    '💳', '🌐', '🔮', '🧩',
    '🎯', '🏆', '🥇', '🪙'
];
