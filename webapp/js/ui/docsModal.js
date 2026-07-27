// ===== МОДАЛЬНОЕ ОКНО ДЛЯ ДОКУМЕНТОВ (Политика / Оферта) =====
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
}
