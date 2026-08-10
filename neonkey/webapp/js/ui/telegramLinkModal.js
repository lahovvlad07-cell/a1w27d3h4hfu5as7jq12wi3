// ===== МОДАЛКА «ПРИВЯЗАТЬ TELEGRAM» =====
// Для тех, кто вошёл по email и хочет добавить Telegram как второй способ
// входа (кнопка в профиле, вкладка «Способы входа»). В отличие от входа,
// здесь не создаётся новый аккаунт — виджет только подтверждает личность
// в Telegram, а привязку к текущей сессии делает Edge Function telegram-link
// (см. supabase/functions/telegram-link).
import { renderTelegramLoginWidget, linkTelegramAccount } from '../lib/telegramAuth.js';
import { showToast } from './toast.js';

export function initTelegramLinkModal({ onLinked } = {}) {
    const overlay = document.getElementById('tgLinkModalOverlay');
    const modal = document.getElementById('tgLinkModal');
    const closeBtn = document.getElementById('tgLinkModalClose');

    function open() {
        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');
        requestAnimationFrame(() => { overlay.classList.add('show'); modal.classList.add('show'); });

        // Перерисовываем виджет при каждом открытии (а не один раз) — иначе
        // после отмены или ошибки повторное подтверждение тем же аккаунтом
        // Telegram может не сработать в уже использованном инстансе виджета.
        renderTelegramLoginWidget('tgLinkWidget', {
            onAuth: async (telegramUser) => {
                const { error } = await linkTelegramAccount(telegramUser);
                if (error) { showToast(`Не удалось привязать Telegram: ${error}`, 'error'); return; }
                close();
                showToast('Telegram привязан к аккаунту', 'success');
                onLinked?.();
            },
        });
    }

    function close() {
        overlay.classList.remove('show');
        modal.classList.remove('show');
        setTimeout(() => { overlay.classList.add('hidden'); modal.classList.add('hidden'); }, 300);
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });

    return { open, close };
}
