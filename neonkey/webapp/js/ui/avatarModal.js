// ===== МОДАЛЬНОЕ ОКНО ВЫБОРА АВАТАРА =====
import { state } from '../state.js';
import { tg } from '../lib/telegram.js';
import { AVATAR_EMOJIS } from '../config.js';
import { updateProfileField } from '../api/profile.js';

let selectedAvatarEmoji = null;

export function initAvatarModal() {
    const avatarModal = document.getElementById('avatarModal');
    const avatarModalOverlay = document.getElementById('modalOverlay');
    const avatarGrid = document.getElementById('avatarGrid');
    const avatarWrapper = document.getElementById('avatarWrapper');
    const avatarEl = document.getElementById('userAvatar');
    const closeAvatarModalBtn = document.getElementById('modalCloseBtn');
    const avatarConfirmBtn = document.getElementById('avatarConfirmBtn');

    function renderAvatarGrid() {
        avatarGrid.innerHTML = '';
        AVATAR_EMOJIS.forEach((emoji) => {
            const div = document.createElement('div');
            div.className = 'avatar-option';
            div.dataset.emoji = emoji;
            div.textContent = emoji;
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.avatar-option').forEach((el) => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedAvatarEmoji = emoji;
                avatarConfirmBtn?.classList.remove('btn-disabled');
            });
            avatarGrid.appendChild(div);
        });
    }

    function openAvatarModal() {
        avatarModal.classList.remove('hidden');
        avatarModalOverlay.classList.remove('hidden');
        selectedAvatarEmoji = null;
        avatarConfirmBtn?.classList.add('btn-disabled');
        renderAvatarGrid();
        const current = state.appData.avatar || '👤';
        document.querySelectorAll('.avatar-option').forEach((el) => {
            if (el.dataset.emoji === current) {
                el.classList.add('selected');
                selectedAvatarEmoji = current;
                avatarConfirmBtn?.classList.remove('btn-disabled');
            }
        });
    }

    function closeAvatarModal() {
        avatarModal.classList.add('hidden');
        avatarModalOverlay.classList.add('hidden');
    }

    avatarConfirmBtn?.addEventListener('click', async function () {
        if (!selectedAvatarEmoji) {
            tg.showAlert('Выберите аватар.');
            return;
        }
        await updateProfileField(state.user.id, state.appData, 'avatar', selectedAvatarEmoji);
        state.appData.avatar = selectedAvatarEmoji;
        avatarEl.textContent = selectedAvatarEmoji;
        closeAvatarModal();
        this.classList.remove('btn-disabled');
    });

    closeAvatarModalBtn?.addEventListener('click', closeAvatarModal);
    avatarModalOverlay?.addEventListener('click', closeAvatarModal);
    avatarWrapper?.addEventListener('click', openAvatarModal);

    return { openAvatarModal, renderAvatarGrid };
}
