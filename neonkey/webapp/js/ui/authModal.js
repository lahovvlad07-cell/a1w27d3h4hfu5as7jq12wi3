// ===== МОДАЛКА ВХОДА =====
// Два способа входа в один и тот же аккаунт: Telegram Login Widget
// (быстрее, сразу синхронизируется с будущим приложением) и email/пароль
// (для тех, кто пока не хочет привязывать Telegram). Модалка сама не
// решает, что делать после успешного входа — вызывает onAuthed(user).
import { renderTelegramLoginWidget, signInWithTelegram } from '../lib/telegramAuth.js';
import { signInWithEmail, signUpWithEmail } from '../lib/auth.js';
import { showToast } from './toast.js';

export function initAuthModal({ onAuthed }) {
    const overlay = document.getElementById('authModalOverlay');
    const modal = document.getElementById('authModal');
    const closeBtn = document.getElementById('authModalClose');
    const tabs = modal.querySelectorAll('.auth-tab');
    const panels = modal.querySelectorAll('.auth-panel');
    const form = document.getElementById('authEmailForm');
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const errorEl = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmitBtn');
    const switchWrap = document.getElementById('authSwitchWrap');

    let mode = 'signin'; // 'signin' | 'signup'
    let widgetRendered = false;

    function setMode(next) {
        mode = next;
        submitBtn.textContent = mode === 'signin' ? 'Войти' : 'Создать аккаунт';
        switchWrap.innerHTML = mode === 'signin'
            ? 'Нет аккаунта? <button type="button" id="authSwitchMode">Зарегистрироваться</button>'
            : 'Уже есть аккаунт? <button type="button" id="authSwitchMode">Войти</button>';
        document.getElementById('authSwitchMode').addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));
        errorEl.textContent = '';
    }

    function open() {
        overlay.classList.remove('hidden');
        modal.classList.remove('hidden');
        requestAnimationFrame(() => { overlay.classList.add('show'); modal.classList.add('show'); });

        if (!widgetRendered) {
            renderTelegramLoginWidget('authTelegramWidget', {
                onAuth: async (telegramUser) => {
                    const { data, error } = await signInWithTelegram(telegramUser);
                    if (error) { showToast(`Не удалось войти через Telegram: ${error}`, 'error', 6000); return; }
                    close();
                    onAuthed?.(data.user);
                },
            });
            widgetRendered = true;
        }
    }

    function close() {
        overlay.classList.remove('show');
        modal.classList.remove('show');
        setTimeout(() => { overlay.classList.add('hidden'); modal.classList.add('hidden'); }, 300);
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
            panels.forEach((p) => p.classList.toggle('is-active', p.dataset.authPanel === tab.dataset.authTab));
        });
    });

    setMode('signin');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.textContent = '';
        submitBtn.disabled = true;

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const action = mode === 'signin' ? signInWithEmail : signUpWithEmail;
        const { data, error } = await action(email, password);

        submitBtn.disabled = false;
        if (error) { errorEl.textContent = error; return; }

        if (mode === 'signup' && !data?.session) {
            showToast('Проверьте почту — нужно подтвердить email, чтобы завершить регистрацию', 'info', 5000);
            close();
            return;
        }
        close();
        onAuthed?.(data.user);
    });

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });

    document.querySelectorAll('[data-open-auth]').forEach((el) => {
        el.addEventListener('click', (e) => { e.preventDefault(); open(); });
    });

    return { open, close };
}
