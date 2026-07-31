// ===== КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ =====
// ВНИМАНИЕ: anon key Supabase предназначен для использования в браузере,
// это нормально, что он "виден" в коде — но это не значит, что таблицы
// не нуждаются в Row Level Security (RLS) в самой Supabase. Обязательно
// проверь политики доступа к таблицам users / settings / orders, иначе
// любой человек через консоль браузера сможет писать в них напрямую,
// в обход проверки "user.id === ADMIN_TELEGRAM_ID" ниже (та проверка
// только прячет кнопку в интерфейсе, она не является защитой).
export const SUPABASE_URL = 'https://fctgewmrouhztylpkuxz.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_x_i9jOKDzok7Ggxwr4qt2w_4vtvdICS';

// Telegram user_id, которому показывается вкладка "Админ".
// TODO: когда пользователей/админов станет больше — вынести список
// админов в таблицу Supabase и проверять через неё, а не хардкодом.
export const ADMIN_TELEGRAM_ID = 6048486427;

export const APP_VERSION = '1.0.0';

// Ссылка на канал проекта
export const CHANNEL_URL = 'https://t.me/neonkey_shop';

// Куда писать в поддержку по задержкам с заказами (пока нет автоматической
// доставки). Замени на свой личный аккаунт/чат поддержки, если он другой.
export const SUPPORT_URL = 'https://t.me/neonkey_shop';

// Базовый URL сервиса neonkey-pay (деплой на Vercel), который реально
// генерирует адреса и проверяет платежи в блокчейне. Смотри README
// этого сервиса — используется тот же Supabase-проект, что и у вебаппа.
// ЗАПОЛНИ после деплоя, например: 'https://neonkey-pay.vercel.app'
export const PAY_API_URL = 'https://a1w27d3h4hfu5as7jq12wi3pay.vercel.app';

// Сколько минут ждём оплату сгенерированного адреса, прежде чем считать
// депозит просроченным. Должно совпадать с DEPOSIT_EXPIRY_MINUTES в
// neonkey-pay/lib/depositExpiry.ts — если поменяешь одно, поменяй и другое.
export const DEPOSIT_EXPIRY_MINUTES = 30;

// Значения по умолчанию, которые используются ТОЛЬКО пока в Supabase
// нет соответствующей записи в таблице settings (например, при самом
// первом запуске проекта на чистой базе).
export const DEFAULT_SETTINGS = {
    usdt_rate: 90,
    ton_rate: 700,
    trx_rate: 15,
    stars_price: 1.5,
    steam_price: 1,
    steam_min: 100,
    stars_min: 50,
    // Комиссия за пополнение по каждой валюте: type 0 = фиксированная (₽),
    // 1 = процент от суммы пополнения. value — само число (₽ либо %).
    commission_type_usdt: 0,
    commission_value_usdt: 250,
    commission_type_trx: 0,
    commission_value_trx: 15,
    commission_type_ton: 0,
    commission_value_ton: 0,
    // Минимальная сумма пополнения в рублях, отдельно по валюте.
    min_usdt: 3000,
    min_trx: 10,
    min_ton: 10,
};

export const AVATAR_EMOJIS = [
    '🚀', '💎', '⚡', '🔥',
    '🌟', '🎮', '🕹️', '💰',
    '💳', '🌐', '🔮', '🧩',
    '🎯', '🏆', '🥇', '🪙'
];

// Баннер о миграции/техработах. enabled: false — полностью выключает баннер.
export const MIGRATION_BANNER = {
    enabled: false,
    days: 7,
};

export const LOCAL_STORAGE_KEYS = {
    data: 'neonkey_data_local',
    consent: 'neonkey_consent_local',
    bannerDismissed: 'neonkey_banner_dismissed',
};
