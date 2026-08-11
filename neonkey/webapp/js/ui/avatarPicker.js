// ===== ВЫБОР АВАТАРА =====
import { AVATAR_EMOJIS } from '../config.js';
import { updateUserMetadata } from '../lib/auth.js';
import { state } from '../state.js';
import { showToast } from './toast.js';

export function initAvatarPicker({ onSaved }) {
    const overlay = document.getElementById('avatarModalOverlay');
    const modal = document.getElementById('avatarModal');
    const grid = document.getElementById('avatarGrid');
    const closeBtn = document.getElementById('avatarModalClose');
    const confirmBtn = document.getElementById('avatarConfirmBtn');

    let selected = null;

    function renderGrid() {
        const current = state.user?.user_metadata?.avatar || '👤';
        grid.innerHTML = AVATAR_EMOJIS.map((emoji) => `
            <button type="button" class="avatar-option${emoji === current ? ' is-selected' : ''}" data-emoji="${emoji}">${emoji}</button>
        `).join('');
        selected = current;

        grid.querySelectorAll('.avatar-option').forEach((el) => {
            el.addEventListener('click', () => {
                grid.querySelectorAll('.avatar-option').forEach((o) => o.classList.remove('is-selected'));
                el.classList.add('is-selected');
                selected = el.dataset.emoji;
            });
        });
    }

    function open() {
        renderGrid();
        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');
        requestAnimationFrame(() => { overlay.classList.add('show'); modal.classList.add('show'); });
    }

    function close() {
        overlay.classList.remove('show');
        modal.classList.remove('show');
        setTimeout(() => { overlay.classList.add('hidden'); modal.classList.add('hidden'); }, 300);
    }

    confirmBtn.addEventListener('click', async () => {
        if (!selected) return;
        const { user, error } = await updateUserMetadata({ avatar: selected });
        if (error) { showToast('Не удалось сохранить аватар', 'error'); return; }
        state.user = user;
        onSaved?.(user);
        close();
        showToast('Аватар обновлён', 'success');
    });

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });

    return { open, close };
}
