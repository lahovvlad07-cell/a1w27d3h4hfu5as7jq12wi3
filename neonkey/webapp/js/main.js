// =========================================================
// NEONKEY — ГЛАВНЫЙ СКРИПТ САЙТА
// Каталог виден всем, но покупка открывается только после входа —
// один аккаунт (Telegram или email) общий с будущим приложением.
// =========================================================
import { CHANNEL_URL, SUPPORT_URL, BOT_USERNAME } from './config.js';
import { supabaseClient } from './lib/supabaseClient.js';
import { state } from './state.js';
import { renderCatalog, initCatalogButtons, setCatalogLocked } from './ui/catalogView.js';
import { initCheckoutModal } from './ui/checkoutModal.js';
import { initDocsModal } from './ui/docsModal.js';
import { initAuthModal } from './ui/authModal.js';
import { initProfileMenu } from './ui/profileMenu.js';
import { showToast } from './ui/toast.js';
import { initScrollReveal } from './lib/scrollReveal.js';

// ---------- Ссылки, зависящие от конфига ----------
document.querySelectorAll('[data-telegram-link]').forEach((el) => { el.href = `https://t.me/${BOT_USERNAME}`; });
document.querySelectorAll('.js-channel-link').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); window.open(CHANNEL_URL, '_blank', 'noopener'); }));
document.querySelectorAll('.js-support-link').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); window.open(SUPPORT_URL, '_blank', 'noopener'); }));

// ---------- Документы (Политика / Оферта) ----------
initDocsModal();

// ---------- Каталог + оплата ----------
const checkoutModal = initCheckoutModal();
renderCatalog();

// ---------- Профиль в шапке ----------
const profileMenu = initProfileMenu({
    onSignedOut: () => {
        state.user = null;
        setCatalogLocked(true);
        showToast('Вы вышли из аккаунта', 'info');
    },
});

// ---------- Модалка входа (Telegram + email) ----------
const authModal = initAuthModal({
    onAuthed: (user) => {
        state.user = user;
        setCatalogLocked(false);
        profileMenu.show(user);
        showToast('Добро пожаловать — каталог открыт', 'success');
    },
});

initCatalogButtons(checkoutModal, authModal.open);

// ---------- Восстановление сессии, если человек уже входил ----------
setCatalogLocked(true);
if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
            state.user = data.session.user;
            setCatalogLocked(false);
            profileMenu.show(data.session.user);
        }
    });
}

// ---------- Шапка: лёгкая тень при прокрутке ----------
const header = document.querySelector('.site-header');
if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
}

// ---------- Линия шагов "как это работает" — рисуется один раз при появлении ----------
const stepsLine = document.getElementById('stepsLineFill');
const stepsWrap = document.querySelector('.steps-wrap');
if (stepsLine && stepsWrap && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) { stepsLine.classList.add('is-drawn'); io.disconnect(); }
        });
    }, { threshold: 0.4 });
    io.observe(stepsWrap);
} else if (stepsLine) {
    stepsLine.classList.add('is-drawn');
}

// ---------- Общий scroll-reveal для секций/карточек ----------
initScrollReveal();
