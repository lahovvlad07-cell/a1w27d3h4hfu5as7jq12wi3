// ===== TELEGRAM WEBAPP (опционально) =====
// Раньше это была ЕДИНСТВЕННАЯ авторизация — приложение отказывалось
// работать, если его открыли не из Telegram. Теперь сайт работает и
// как обычный сайт, и как Telegram Mini App, а авторизация везде одна —
// email + пароль (см. lib/auth.js). Этот модуль остался только для
// мелких Telegram-удобств (expand на весь экран, открытие ссылок), и
// аккуратно "заглушается", если приложение открыто в обычном браузере.
const hasTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp;

export const tg = hasTelegram
    ? window.Telegram.WebApp
    : {
          // Заглушки — чтобы остальной код мог звать tg.expand()/tg.ready()
          // и т.д., не проверяя каждый раз, открыты ли мы в Telegram.
          ready: () => {},
          expand: () => {},
          showAlert: (msg) => window.alert(msg),
          openLink: (url) => window.open(url, '_blank', 'noopener'),
      };

export function isTelegramContext() {
    return hasTelegram;
}
