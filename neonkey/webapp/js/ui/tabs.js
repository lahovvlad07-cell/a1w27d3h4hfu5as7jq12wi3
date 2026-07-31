// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
import { state } from '../state.js';
import { tg } from '../lib/telegram.js';
import { loadSettings } from '../api/settings.js';
import { updatePricesDisplay } from './shop.js';
import { refreshHistoryFromServer } from './history.js';
import { refreshBiggestDeal } from './profileView.js';
import { CHANNEL_URL, SUPPORT_URL } from '../config.js';

export function initTabs() {
    const pages = {
        profile: document.getElementById('page-profile'),
        shop: document.getElementById('page-shop'),
        info: document.getElementById('page-info'),
        admin: document.getElementById('page-admin'),
    };
    const navItems = document.querySelectorAll('.nav-item');

    function switchTab(tabId) {
        Object.values(pages).forEach((page) => {
            if (!page) return;
            page.classList.toggle('active', page.id === `page-${tabId}`);
        });
        navItems.forEach((item) => item.classList.toggle('active', item.dataset.tab === tabId));
        tg.expand();

        // При переключении на магазин обновляем настройки и цены —
        // чтобы витрина всегда показывала актуальные минималки/цены.
        if (tabId === 'shop' && state.appData.consent) {
            loadSettings().then((newSettings) => {
                if (newSettings) {
                    state.settings = newSettings;
                    updatePricesDisplay(state.currentProduct);
                }
            });
        }

        // При возврате в профиль подтягиваем актуальные статусы заказов —
        // если админ обработал заказ, пока вкладка была закрыта, статус
        // "В обработке" должен смениться на "Выполнен"/"Отклонён".
        if (tabId === 'profile' && state.appData.consent) {
            refreshHistoryFromServer();
            refreshBiggestDeal();
        }
    }

    navItems.forEach((item) => {
        item.addEventListener('click', function () {
            const tab = this.dataset.tab;
            if (tab) switchTab(tab);
        });
    });

    // ===== ИНФОРМАЦИОННЫЕ ВКЛАДКИ =====
    const infoTabs = document.querySelectorAll('.info-tab');
    const infoPanels = {
        about: document.getElementById('info-about'),
        privacy: document.getElementById('info-privacy'),
        offer: document.getElementById('info-offer'),
    };

    infoTabs.forEach((tab) => {
        tab.addEventListener('click', function () {
            infoTabs.forEach((t) => t.classList.remove('active'));
            this.classList.add('active');
            const target = this.dataset.tab;
            Object.keys(infoPanels).forEach((key) => {
                infoPanels[key].classList.toggle('active', key === target);
            });
        });
    });

    // ===== ССЫЛКА НА КАНАЛ =====
    document.getElementById('channelLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        tg.openLink(CHANNEL_URL);
    });
    document.getElementById('channelLinkSupport')?.addEventListener('click', (e) => {
        e.preventDefault();
        tg.openLink(SUPPORT_URL);
    });

    return { switchTab };
}
