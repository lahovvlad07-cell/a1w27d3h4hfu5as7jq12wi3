// =========================================================
// NEONKEY — СКРИПТ ГЛАВНОЙ СТРАНИЦЫ
// Каталог и всё, что требует входа, живёт на account.html — здесь
// только маркетинговая часть и вход, который ведёт туда.
// =========================================================
import { CHANNEL_URL, SUPPORT_URL, BOT_USERNAME } from './config.js';
import { supabaseClient } from './lib/supabaseClient.js';
import { state } from './state.js';
import { CATALOG } from './data/catalog.js';
import { fetchPricingConfig, applyPricingConfig } from './lib/pricingConfig.js';
import { initDocsModal } from './ui/docsModal.js';
import { initAuthModal } from './ui/authModal.js';
import { initHeaderAuthState } from './ui/headerAuthState.js';
import { initScrollReveal } from './lib/scrollReveal.js';
import { initPulseLine } from './lib/pulseLine.js';
import { renderAssortmentPreview } from './assortmentPreview.js';

// ---------- Ссылки, зависящие от конфига ----------
document.querySelectorAll('[data-telegram-link]').forEach((el) => { el.href = `https://t.me/${BOT_USERNAME}`; });
document.querySelectorAll('.js-channel-link').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); window.open(CHANNEL_URL, '_blank', 'noopener'); }));
document.querySelectorAll('.js-support-link').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); window.open(SUPPORT_URL, '_blank', 'noopener'); }));

// ---------- Документы (Политика / Оферта) ----------
initDocsModal();

// ---------- Шапка: «Войти» или ссылка в кабинет ----------
const headerAuth = initHeaderAuthState();

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

// ---------- Пульс-линия в hero: после отрисовки — живая, с случайными импульсами ----------
initPulseLine();

// ---------- Превью ассортимента — сначала подтягиваем актуальные цены из
// той же таблицы pricing_config, что читает кабинет (см. account.js и
// lib/pricingConfig.js), и только потом рендерим карточки — иначе на
// главной всегда были бы видны дефолты из data/catalog.js, даже после
// правок в админке. Рендерим здесь и ждём именно в этом месте (а не в
// фоне отдельной веткой), потому что ниже auth-модалка один раз при
// инициализации подключает обработчики ко всем кнопкам [data-open-auth] —
// если отрендерить карточки позже, её кнопка «Купить» останется без
// обработчика. Если Supabase недоступен или таблица ещё не заведена —
// fetchPricingConfig() тихо вернёт null и просто останутся дефолты,
// ничего не ломается.
const pricingConfig = await fetchPricingConfig();
applyPricingConfig(CATALOG, pricingConfig);
renderAssortmentPreview();

// ---------- Модалка входа — после успеха сразу ведём в кабинет ----------
const authModal = initAuthModal({
    onAuthed: (user) => {
        state.user = user;
        window.location.href = 'account.html';
    },
    onLinked: () => {
        // Уже были залогинены на лендинге и всё равно подтвердили Telegram —
        // просто ведём в кабинет, там подтянутся свежие данные.
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

