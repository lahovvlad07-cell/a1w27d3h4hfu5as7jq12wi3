// ===== МОДАЛКА ЮРИДИЧЕСКИХ ДОКУМЕНТОВ =====
import { docsContent } from '../content/legalDocs.js';

export function initDocsModal() {
    const overlay = document.getElementById('docModalOverlay');
    const modal = document.getElementById('docModal');
    const titleEl = document.getElementById('docModalTitle');
    const bodyEl = document.getElementById('docModalBody');
    const closeBtn = document.getElementById('docModalClose');

    function open(key) {
        const doc = docsContent[key];
        if (!doc) return;
        titleEl.textContent = doc.title;
        bodyEl.innerHTML = doc.html;
        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            overlay.classList.add('show');
            modal.classList.add('show');
        });
    }

    function close() {
        overlay.classList.remove('show');
        modal.classList.remove('show');
        setTimeout(() => {
            overlay.classList.add('hidden');
            modal.classList.add('hidden');
        }, 300);
    }

    document.querySelectorAll('[data-doc]').forEach((el) => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            open(el.dataset.doc);
        });
    });
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) close();
    });

    return { open, close };
}
