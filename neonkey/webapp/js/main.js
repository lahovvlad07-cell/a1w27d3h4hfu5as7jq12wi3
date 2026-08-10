// =========================================================
// NEONKEY — ГЛАВНЫЙ СКРИПТ САЙТА
// Сайт самодостаточен: каталог, оплата и вход через Telegram
// работают прямо здесь, без входа в отдельный личный кабинет —
// он появится позже как Telegram Mini App и будет синхронизирован
// с этим сайтом через тот же Supabase-проект (см. js/config.js).
// =========================================================
import { CHANNEL_URL, SUPPORT_URL, BOT_USERNAME } from './config.js';
import { renderTelegramLoginWidget, signInWithTelegram } from './lib/telegramAuth.js';
import { supabaseClient } from './lib/supabaseClient.js';
import { state } from './state.js';
import { renderCatalog, initCatalogButtons } from './ui/catalogView.js';
import { initCheckoutModal } from './ui/checkoutModal.js';
import { initDocsModal } from './ui/docsModal.js';
import { showToast } from './ui/toast.js';
import { initScrollReveal } from './lib/scrollReveal.js';
import { initKeycard } from './ui/keycard.js';

// ---------- Ссылки, зависящие от конфига ----------
document.querySelectorAll('[data-telegram-link]').forEach((el) => {
    el.href = `https://t.me/${BOT_USERNAME}`;
});
document.getElementById('footerChannelLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(CHANNEL_URL, '_blank', 'noopener');
});
document.querySelectorAll('.js-support-link').forEach((el) => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        window.open(SUPPORT_URL, '_blank', 'noopener');
    });
});

// ---------- Каталог с оплатой — доступен без входа в аккаунт ----------
const checkoutModal = initCheckoutModal();
renderCatalog();
initCatalogButtons(checkoutModal);

// ---------- Документы (Политика / Оферта) ----------
initDocsModal();

// ---------- Восстановление сессии, если человек уже входил ----------
if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data }) => {
        if (data?.session?.user) state.user = data.session.user;
    });
}

// ---------- Вход через Telegram (внутри ключ-карты в hero) ----------
renderTelegramLoginWidget('telegramLoginWidget', {
    onAuth: async (telegramUser) => {
        const { data, error } = await signInWithTelegram(telegramUser);
        if (error) {
            showToast(`Не удалось войти через Telegram: ${error}`, 'error');
            return;
        }
        state.user = data.user;
        showToast(`Добро пожаловать, ${telegramUser.first_name || 'друг'} — аккаунт синхронизирован`, 'success');
    },
});

// ---------- Шапка: лёгкая тень/фон при прокрутке ----------
const header = document.querySelector('.site-header');
if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
}

// ---------- Линия шагов "как это работает" — рисуется при появлении ----------
const stepsLine = document.getElementById('stepsLineFill');
if (stepsLine && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    stepsLine.classList.add('is-drawn');
                    io.disconnect();
                }
            });
        },
        { threshold: 0.4 }
    );
    io.observe(document.querySelector('.steps-wrap'));
} else if (stepsLine) {
    stepsLine.classList.add('is-drawn');
}

// ---------- Ключ-карта: наклон за курсором + анимации ----------
initKeycard();

// ---------- Общий scroll-reveal для секций/карточек ----------
initScrollReveal();
