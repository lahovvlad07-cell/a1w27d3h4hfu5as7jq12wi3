// ===== ТОЧКА ВХОДА ПРИЛОЖЕНИЯ =====
import { state } from './state.js';
import { tg } from './lib/telegram.js';
import { getSession } from './lib/auth.js';

import { initDocsModal } from './ui/docsModal.js';
import { initAuthScreen } from './ui/authScreen.js';
import { showWelcomeModal } from './ui/welcomeModal.js';
import { initAvatarModal } from './ui/avatarModal.js';
import { renderCatalog, initCatalogButtons } from './ui/catalogView.js';
import { initCheckoutModal } from './ui/checkoutModal.js';
import { renderProfile, initSignOut, initProfileLinking } from './ui/profileView.js';
import { initTabs } from './ui/tabs.js';
import { hideLoadingOverlay } from './ui/loadingOverlay.js';

(async function initApp() {
    console.log('🚀 Запуск приложения...');

    // ===== МОДАЛКА ДОКУМЕНТОВ РАБОТАЕТ ДАЖЕ ДО АВТОРИЗАЦИИ =====
    // (на экране регистрации есть ссылки на Политику/Оферту)
    initDocsModal();

    // ===== БАЗОВЫЕ UI-МОДУЛИ, НЕ ЗАВИСЯЩИЕ ОТ АВТОРИЗАЦИИ =====
    const { switchTab } = initTabs();
    const { openAvatarModal } = initAvatarModal();
    const checkoutModal = initCheckoutModal();
    renderCatalog();
    initCatalogButtons(checkoutModal);
    initProfileLinking();
    initSignOut(() => {
        state.user = null;
        hideApp();
        authScreen.show();
    });

    const appEl = document.getElementById('app');
    function hideApp() {
        appEl.style.display = 'none';
    }
    function showApp() {
        appEl.style.display = 'block';
        switchTab('profile');
    }

    const authScreen = initAuthScreen({
        onAuthenticated: (user) => {
            state.user = user;
            state.avatar = user?.user_metadata?.avatar || '👤';
            renderProfile();
            showApp();
            if (!user?.user_metadata?.avatar) {
                showWelcomeModal(() => openAvatarModal());
            }
        },
    });

    // ===== ВОССТАНОВЛЕНИЕ УЖЕ СУЩЕСТВУЮЩЕЙ СЕССИИ =====
    const session = await getSession();
    hideLoadingOverlay();

    if (session?.user) {
        state.user = session.user;
        state.avatar = session.user.user_metadata?.avatar || '👤';
        renderProfile();
        showApp();
    } else {
        hideApp();
        authScreen.show();
    }

    // ===== ФИНАЛ (Telegram Mini App, если открыты внутри Telegram) =====
    tg.ready();
    tg.expand();
    console.log('✅ NeonKey v2.1.0 загружен');
})();
