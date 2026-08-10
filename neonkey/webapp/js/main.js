// =========================================================
// NEONKEY — СКРИПТ ГЛАВНОЙ СТРАНИЦЫ
// Каталог и всё, что требует входа, живёт на account.html — здесь
// только маркетинговая часть и вход, который ведёт туда.
// =========================================================
import { CHANNEL_URL, SUPPORT_URL, BOT_USERNAME } from './config.js';
import { supabaseClient } from './lib/supabaseClient.js';
import { state } from './state.js';
import { initDocsModal } from './ui/docsModal.js';
import { initAuthModal } from './ui/authModal.js';
import { initHeaderAuthState } from './ui/headerAuthState.js';
import { initScrollReveal } from './lib/scrollReveal.js';

// ---------- Ссылки, зависящие от конфига ----------
document.querySelectorAll('[data-telegram-link]').forEach((el) => { el.href = `https://t.me/${BOT_USERNAME}`; });
document.querySelectorAll('.js-channel-link').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); window.open(CHANNEL_URL, '_blank', 'noopener'); }));
document.querySelectorAll('.js-support-link').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); window.open(SUPPORT_URL, '_blank', 'noopener'); }));

// ---------- Документы (Политика / Оферта) ----------
initDocsModal();

// ---------- Шапка: «Войти» или ссылка в кабинет ----------
const headerAuth = initHeaderAuthState();

// ---------- Модалка входа — после успеха сразу ведём в кабинет ----------
const authModal = initAuthModal({
    onAuthed: (user) => {
        state.user = user;
        window.location.href = 'account.html';
    },
});

// Кнопки hero открывают кабинет, если уже вошли, иначе — модалку входа
function goToCabinet() {
    if (state.user) window.location.href = 'account.html';
    else authModal.open();
}
document.getElementById('heroOpenCabinet')?.addEventListener('click', goToCabinet);
document.getElementById('heroOpenCabinet2')?.addEventListener('click', goToCabinet);

// ---------- Восстановление сессии, если человек уже входил ----------
if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
            state.user = data.session.user;
            headerAuth.show(data.session.user);
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

// ---------- Общий scroll-reveal для секций ----------
initScrollReveal();
