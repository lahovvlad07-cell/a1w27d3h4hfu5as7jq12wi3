// ===== ТОЧКА ВХОДА ПРИЛОЖЕНИЯ =====
import { state } from './state.js';
import { tg, requireAuth } from './lib/telegram.js';
import { loadLocalData, getDefaultData, loadLocalConsent } from './lib/storage.js';
import { loadProfile } from './api/profile.js';
import { loadSettings } from './api/settings.js';
import { ADMIN_TELEGRAM_ID } from './config.js';

import { initDocsModal } from './ui/docsModal.js';
import { initMigrationBanner } from './ui/migrationBanner.js';
import { initConsentFlow } from './ui/consent.js';
import { showWelcomeModal } from './ui/welcomeModal.js';
import { initAvatarModal } from './ui/avatarModal.js';
import { initDepositButton, initDepositModal } from './ui/depositModal.js';
import { initShopButtons, initOrderModal } from './ui/orderModal.js';
import { updatePricesDisplay } from './ui/shop.js';
import { renderHistory } from './ui/history.js';
import { renderProfile, updateBalanceDisplay } from './ui/profileView.js';
import { initTabs } from './ui/tabs.js';
import { showAdminTab, loadAdminSettings, initAdminSettingsForm, renderAdminOrders } from './ui/admin.js';

(async function initApp() {
    console.log('🚀 Запуск приложения...');

    // ===== МОДАЛКА ДОКУМЕНТОВ И БАННЕР РАБОТАЮТ ДАЖЕ ДО АВТОРИЗАЦИИ =====
    initDocsModal();
    initMigrationBanner();

    // ===== ПРОВЕРКА АВТОРИЗАЦИИ TELEGRAM =====
    const user = requireAuth();
    if (!user) {
        console.warn('Авторизация не пройдена — приложение открыто не из Telegram.');
        return;
    }
    state.user = user;

    // ===== ЗАГРУЗКА ПРОФИЛЯ =====
    try {
        const profile = await loadProfile(user.id);
        state.appData.avatar = profile.avatar || '👤';
        state.appData.orders = profile.orders || [];
        state.appData.consent = profile.consent || false;
        state.appData.balance = profile.balance || 0;
        console.log('✅ Профиль загружен:', state.appData);
    } catch (e) {
        console.error('❌ Ошибка загрузки профиля, используем localStorage', e);
        const local = loadLocalData() || getDefaultData();
        state.appData = { ...local, consent: loadLocalConsent() };
    }

    // ===== ЗАГРУЗКА НАСТРОЕК (если согласие уже дано) =====
    if (state.appData.consent) {
        state.settings = (await loadSettings()) || {};
        console.log('Настройки загружены:', state.settings);
        updatePricesDisplay(state.currentProduct);
        updateBalanceDisplay();
    }

    // ===== ИНИЦИАЛИЗАЦИЯ UI-МОДУЛЕЙ =====
    const { switchTab } = initTabs();
    const { openAvatarModal } = initAvatarModal();
    initDepositModal();
    initOrderModal();
    initAdminSettingsForm();

    function activateFullShopExperience() {
        if (state.user.id === ADMIN_TELEGRAM_ID) {
            showAdminTab(switchTab);
            loadAdminSettings();
            renderAdminOrders();
        }
        initShopButtons();
        initDepositButton();
    }

    // ===== СОГЛАСИЕ С ПОЛИТИКАМИ =====
    initConsentFlow({
        onAccepted: activateFullShopExperience,
        onNeedsAvatar: () => showWelcomeModal(() => openAvatarModal()),
    });

    // ===== ЗАПОЛНЕНИЕ ПРОФИЛЯ И ИСТОРИИ =====
    renderProfile();
    renderHistory();

    // ===== ФИНАЛ =====
    tg.ready();
    tg.expand();
    console.log(`✅ NeonKey v1.0.0 загружен`);
})();
