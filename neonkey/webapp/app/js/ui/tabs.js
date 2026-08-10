// ===== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК =====
import { tg } from '../lib/telegram.js';
import { CHANNEL_URL, SUPPORT_URL } from '../config.js';

export function initTabs() {
    const pages = {
        profile: document.getElementById('page-profile'),
        info: document.getElementById('page-info'),
    };
    const navItems = document.querySelectorAll('.nav-item');

    function switchTab(tabId) {
        Object.values(pages).forEach((page) => {
            if (!page) return;
            page.classList.toggle('active', page.id === `page-${tabId}`);
        });
        navItems.forEach((item) => item.classList.toggle('active', item.dataset.tab === tabId));
        tg.expand();
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
        faq: document.getElementById('info-faq'),
        privacy: document.getElementById('info-privacy'),
        offer: document.getElementById('info-offer'),
    };

    infoTabs.forEach((tab) => {
        tab.addEventListener('click', function () {
            infoTabs.forEach((t) => t.classList.remove('active'));
            this.classList.add('active');
            const target = this.dataset.tab;
            Object.keys(infoPanels).forEach((key) => {
                infoPanels[key]?.classList.toggle('active', key === target);
            });
        });
    });

    // ===== ССЫЛКА НА КАНАЛ / ПОДДЕРЖКУ =====
    document.querySelectorAll('.channel-link').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            tg.openLink(CHANNEL_URL);
        });
    });
    document.querySelectorAll('.support-link').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            tg.openLink(SUPPORT_URL);
        });
    });

    return { switchTab };
}
