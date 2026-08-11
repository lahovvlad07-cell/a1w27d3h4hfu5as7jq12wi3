// ===== ИКОНКИ КАТАЛОГА =====
// Простые line-art SVG-иконки под цветовую палитру бренда (градиенты из
// tokens.css — голубой/сиреневый/розовый) вместо эмодзи, чтобы карточки
// выглядели одинаково на любой ОС и держали единый стиль сайта.
// Ключ объекта — значение поля `icon` в data/catalog.js.
export const PRODUCT_ICONS = {
    // Кошелёк со стрелкой вверх — пополнение баланса.
    steam: `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <linearGradient id="gradSteamIcon" x1="2" y1="3" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="var(--accent-cyan)"/>
                    <stop offset="100%" stop-color="var(--accent-violet)"/>
                </linearGradient>
            </defs>
            <rect x="3" y="7.5" width="18" height="12.5" rx="3" stroke="url(#gradSteamIcon)" stroke-width="1.6"/>
            <path d="M3 11.5H21" stroke="url(#gradSteamIcon)" stroke-width="1.6"/>
            <circle cx="16.5" cy="15.6" r="1.5" fill="url(#gradSteamIcon)"/>
            <path d="M12 3V6.4" stroke="url(#gradSteamIcon)" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M9.6 5L12 3L14.4 5" stroke="url(#gradSteamIcon)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `,
    // Четырёхлучевая звезда-искра — Telegram Stars.
    stars: `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <linearGradient id="gradStarsIcon" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="var(--accent-magenta)"/>
                    <stop offset="100%" stop-color="var(--accent-violet)"/>
                </linearGradient>
            </defs>
            <path d="M12 2.6L14 9.2L20.6 11L14 12.8L12 19.4L10 12.8L3.4 11L10 9.2L12 2.6Z" fill="url(#gradStarsIcon)"/>
            <path d="M18.6 2.6L19.3 5L21.7 5.7L19.3 6.4L18.6 8.8L17.9 6.4L15.5 5.7L17.9 5L18.6 2.6Z" fill="url(#gradStarsIcon)" opacity="0.7"/>
        </svg>
    `,
};
