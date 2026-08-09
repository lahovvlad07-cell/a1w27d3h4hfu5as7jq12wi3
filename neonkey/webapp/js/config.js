// ===== КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ =====
// ВНИМАНИЕ: anon key Supabase предназначен для использования в браузере,
// это нормально, что он "виден" в коде. Приложение больше не хранит
// пользовательские данные в собственных таблицах (users/orders/settings) —
// единственное, что используется из Supabase, это Supabase Auth
// (email + пароль + код подтверждения), поэтому отдельные RLS-политики
// на таблицы теперь не нужны вообще.
export const SUPABASE_URL = 'https://fctgewmrouhztylpkuxz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_x_i9jOKDzok7Ggxwr4qt2w_4vtvdICS';

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
