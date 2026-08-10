// ===== ЛЕНДИНГ NEONKEY (обычный сайт, каталог — прямо здесь) =====
// Переиспользует те же модули, что и личный кабинет (app/js/...), чтобы
// не дублировать логику Supabase/Telegram/каталога — просто другая
// обёртка вокруг них, заточенная под маркетинговую страницу. Каталог и
// оплата работают тут БЕЗ входа в аккаунт — вход нужен только для
// истории заказов в профиле (app/).
import { CHANNEL_URL, SUPPORT_URL, BOT_USERNAME } from '../app/js/config.js';
import { docsContent } from '../app/js/content/legalDocs.js';
import { renderTelegramLoginWidget, signInWithTelegram } from '../app/js/lib/telegramAuth.js';
import { supabaseClient } from '../app/js/lib/supabaseClient.js';
import { state } from '../app/js/state.js';
import { renderCatalog, initCatalogButtons } from '../app/js/ui/catalogView.js';
import { initCheckoutModal } from '../app/js/ui/checkoutModal.js';

// ===== Ссылки, зависящие от конфига =====
document.getElementById('heroTelegramLink').href = `https://t.me/${BOT_USERNAME}`;
document.getElementById('footerChannelLink').addEventListener('click', (e) => {
    e.preventDefault();
    window.open(CHANNEL_URL, '_blank', 'noopener');
});
document.getElementById('footerSupportLink').addEventListener('click', (e) => {
    e.preventDefault();
    window.open(SUPPORT_URL, '_blank', 'noopener');
});

// ===== Каталог с оплатой — доступен без входа в аккаунт =====
const checkoutModal = initCheckoutModal();
renderCatalog();
initCatalogButtons(checkoutModal);

// ===== Если человек уже входил раньше (сессия сохранена в браузере) —
// подтягиваем её сюда же, чтобы клики "Купить" на этой странице тоже
// попадали в историю заказов профиля (app/), а не только те, что были
// нажаты внутри личного кабинета. =====
if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data }) => {
        if (data?.session?.user) state.user = data.session.user;
    });
}

// ===== Вход через Telegram прямо с лендинга =====
renderTelegramLoginWidget('telegramLoginWidget', {
    onAuth: async (telegramUser) => {
        const { data, error } = await signInWithTelegram(telegramUser);
        if (error) {
            showToast(`Не удалось войти через Telegram: ${error}`, 'error');
            return;
        }
        state.user = data.user;
        showToast('Вход выполнен — открываем личный кабинет…', 'success');
        window.location.href = '/app/';
    },
});

// ===== Модалка документов (Политика / Оферта) =====
const docModal = document.getElementById('docModal');
const docModalOverlay = document.getElementById('docModalOverlay');
const docModalTitle = document.getElementById('docModalTitle');
const docModalBody = document.getElementById('docModalBody');

function openDoc(key) {
    const doc = docsContent[key];
    if (!doc) return;
    docModalTitle.textContent = doc.title;
    docModalBody.innerHTML = doc.html;
    docModal.classList.remove('hidden');
    docModalOverlay.classList.remove('hidden');
}
function closeDoc() {
    docModal.classList.add('hidden');
    docModalOverlay.classList.add('hidden');
}
document.querySelectorAll('.doc-link').forEach((el) => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        openDoc(el.dataset.doc);
    });
});
document.getElementById('docModalClose').addEventListener('click', closeDoc);
docModalOverlay.addEventListener('click', closeDoc);

// ===== Тост =====
let toastTimer = null;
function showToast(message, type = 'info', duration = 3500) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = `toast ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}
