// ===== МОДАЛЬНОЕ ОКНО ДЛЯ ДОКУМЕНТОВ (Политика / Оферта) =====
// Также используется, чтобы один раз при старте заполнить те же самые
// тексты во вкладке "Информация" — вместо дублирования HTML в двух
// местах (как было раньше) текст берётся из одного источника
// (content/legalDocs.js) и вставляется и в модалку, и в панель.
import { docsContent } from '../content/legalDocs.js';

export function initDocsModal() {
    const docModal = document.getElementById('docModal');
    const docModalOverlay = document.getElementById('docModalOverlay');
    const docModalClose = document.getElementById('docModalClose');
    const docModalTitle = document.getElementById('docModalTitle');
    const docModalBody = document.getElementById('docModalBody');

    function openDocModal(docKey) {
        const doc = docsContent[docKey];
        if (!doc) return;
        docModalTitle.textContent = doc.title;
        docModalBody.innerHTML = doc.html;
        docModal.classList.remove('hidden');
        docModalOverlay.classList.remove('hidden');
    }

    function closeDocModal() {
        docModal.classList.add('hidden');
        docModalOverlay.classList.add('hidden');
    }

    document.addEventListener('click', (e) => {
        const target = e.target.closest('.doc-link');
        if (target) {
            e.preventDefault();
            const doc = target.dataset.doc;
            if (doc) openDocModal(doc);
        }
    });

    docModalClose?.addEventListener('click', closeDocModal);
    docModalOverlay?.addEventListener('click', closeDocModal);

    // ===== Те же тексты — во вкладке "Информация" =====
    const privacyPanel = document.getElementById('info-privacy');
    const offerPanel = document.getElementById('info-offer');
    if (privacyPanel) privacyPanel.innerHTML = `<h2>${docsContent.privacy.title}</h2>${docsContent.privacy.html}`;
    if (offerPanel) offerPanel.innerHTML = `<h2>${docsContent.offer.title}</h2>${docsContent.offer.html}`;
}
