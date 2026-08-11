// ===== ВКЛАДКА «ИНФОРМАЦИЯ» — переключение подвкладок =====
import { docsContent } from '../content/legalDocs.js';

export function initInfoTabs() {
    const tabs = document.querySelectorAll('.info-tab');
    const panels = document.querySelectorAll('.info-panel');

    document.getElementById('info-privacy').innerHTML = docsContent.privacy.html;
    document.getElementById('info-offer').innerHTML = docsContent.offer.html;

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
            panels.forEach((p) => p.classList.toggle('is-active', p.id === `info-${tab.dataset.infoTab}`));
        });
    });
}
