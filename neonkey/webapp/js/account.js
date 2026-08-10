// =========================================================
// NEONKEY — ЛИЧНЫЙ КАБИНЕТ (account.html)
// Вся страница требует входа: без сессии показывается только экран
// «Войдите, чтобы продолжить» с той же модалкой входа, что на лендинге.
// После входа — три вкладки: Каталог, Профиль, Информация.
// =========================================================
import { CHANNEL_URL, SUPPORT_URL } from './config.js';
import { supabaseClient } from './lib/supabaseClient.js';
import { state } from './state.js';
import { renderCatalog, initCatalogButtons } from './ui/catalogView.js';
import { initCheckoutModal } from './ui/checkoutModal.js';
import { initAuthModal } from './ui/authModal.js';
import { initAvatarPicker } from './ui/avatarPicker.js';
import { initTelegramLinkModal } from './ui/telegramLinkModal.js';
import { initProfilePage } from './ui/profilePage.js';
import { initInfoTabs } from './ui/infoTabs.js';
import { showToast } from './ui/toast.js';
import { initScrollReveal } from './lib/scrollReveal.js';

document.querySelectorAll('.js-channel-link').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); window.open(CHANNEL_URL, '_blank', 'noopener'); }));
document.querySelectorAll('.js-support-link').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); window.open(SUPPORT_URL, '_blank', 'noopener'); }));

const gateEl = document.getElementById('accountGate');
const shellEl = document.getElementById('accountShell');

// ---------- Вкладки кабинета ----------
function initTabs() {
    const tabs = document.querySelectorAll('.account-tab');
    const panels = document.querySelectorAll('.account-panel');

    function activate(name) {
        tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.accountTab === name));
        panels.forEach((p) => p.classList.toggle('is-active', p.id === `panel-${name}`));
    }

    tabs.forEach((tab) => tab.addEventListener('click', () => {
        activate(tab.dataset.accountTab);
        history.replaceState(null, '', `#${tab.dataset.accountTab}`);
    }));

    const initial = location.hash.replace('#', '') || 'catalog';
    activate(['catalog', 'profile', 'info'].includes(initial) ? initial : 'catalog');
}

// ---------- Инициализация содержимого кабинета (один раз, при первом входе) ----------
let contentInitialized = false;
function initAccountContent() {
    if (contentInitialized) return;
    contentInitialized = true;

    const checkoutModal = initCheckoutModal();
    renderCatalog();
    initCatalogButtons(checkoutModal);

    const avatarPicker = initAvatarPicker({ onSaved: () => profilePage.render() });
    const telegramLinkModal = initTelegramLinkModal({
        onLinked: async () => {
            // Привязка обновляет user_metadata на сервере через service_role —
            // локальная сессия об этом не узнает сама, поэтому запрашиваем
            // свежего пользователя, прежде чем перерисовать профиль.
            if (supabaseClient) {
                const { data } = await supabaseClient.auth.getUser();
                if (data?.user) state.user = data.user;
            }
            profilePage.render();
        },
    });
    const profilePage = initProfilePage({
        avatarPicker,
        telegramLinkModal,
        onSignedOut: () => {
            state.user = null;
            showGate();
            showToast('Вы вышли из аккаунта', 'info');
        },
    });
    profilePage.render();

    initInfoTabs();
    initTabs();
    initScrollReveal();
}

function showGate() {
    gateEl.classList.remove('hidden');
    shellEl.classList.add('hidden');
}
function showShell() {
    gateEl.classList.add('hidden');
    shellEl.classList.remove('hidden');
    initAccountContent();
}

// ---------- Модалка входа (доступна и на этой странице — прямо на гейте) ----------
const authModal = initAuthModal({
    onAuthed: (user) => {
        state.user = user;
        showShell();
        showToast('Добро пожаловать в личный кабинет', 'success');
    },
});
void authModal;

// ---------- Проверка сессии при загрузке ----------
if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
            state.user = data.session.user;
            showShell();
        } else {
            showGate();
        }
    });
} else {
    showGate();
}
