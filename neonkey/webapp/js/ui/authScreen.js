// ===== ЭКРАН АВТОРИЗАЦИИ (вход / регистрация) =====
// Без письма и кода подтверждения — регистрация сразу заводит сессию
// (при условии, что в Supabase выключен тумблер «Confirm email», см.
// комментарий в lib/auth.js). Показывается, пока нет активной сессии
// Supabase Auth, и не пускает дальше без неё — что на сайте, что в
// Telegram Mini App.
import { signUp, signInWithPassword, requestPasswordReset } from '../lib/auth.js';
import { showToast } from './toast.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initAuthScreen({ onAuthenticated }) {
    const overlay = document.getElementById('authOverlay');
    const stepLogin = document.getElementById('authStepLogin');
    const stepRegister = document.getElementById('authStepRegister');

    function show() {
        overlay.classList.remove('hidden');
    }
    function hide() {
        overlay.classList.add('hidden');
    }
    function showStep(step) {
        [stepLogin, stepRegister].forEach((el) => el.classList.add('u-hidden'));
        step.classList.remove('u-hidden');
    }

    // ===== Переключение вкладок Вход / Регистрация =====
    document.getElementById('authGoRegister').addEventListener('click', () => showStep(stepRegister));
    document.getElementById('authGoLogin').addEventListener('click', () => showStep(stepLogin));

    // ===== ВХОД =====
    const loginForm = document.getElementById('authLoginForm');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authLoginEmail').value.trim();
        const password = document.getElementById('authLoginPassword').value;
        const btn = document.getElementById('authLoginSubmit');
        const errEl = document.getElementById('authLoginError');
        errEl.textContent = '';

        if (!EMAIL_RE.test(email)) {
            errEl.textContent = 'Введите корректный email.';
            return;
        }
        if (!password) {
            errEl.textContent = 'Введите пароль.';
            return;
        }

        btn.disabled = true;
        const { data, error } = await signInWithPassword(email, password);
        btn.disabled = false;

        if (error) {
            errEl.textContent = humanizeAuthError(error);
            return;
        }
        hide();
        onAuthenticated(data.user);
    });

    document.getElementById('authForgotPassword').addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authLoginEmail').value.trim();
        if (!EMAIL_RE.test(email)) {
            showToast('Сначала введите email в поле выше', 'error');
            return;
        }
        const { error } = await requestPasswordReset(email);
        if (error) {
            showToast(`Не удалось отправить письмо: ${error}`, 'error', 4000);
        } else {
            showToast('Письмо для сброса пароля отправлено на почту', 'success', 4000);
        }
    });

    // ===== РЕГИСТРАЦИЯ =====
    const registerForm = document.getElementById('authRegisterForm');
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('authRegEmail').value.trim();
        const password = document.getElementById('authRegPassword').value;
        const password2 = document.getElementById('authRegPassword2').value;
        const consent = document.getElementById('authRegConsent').checked;
        const btn = document.getElementById('authRegisterSubmit');
        const errEl = document.getElementById('authRegisterError');
        errEl.textContent = '';

        if (!EMAIL_RE.test(email)) {
            errEl.textContent = 'Введите корректный email.';
            return;
        }
        if (password.length < 6) {
            errEl.textContent = 'Пароль должен быть не короче 6 символов.';
            return;
        }
        if (password !== password2) {
            errEl.textContent = 'Пароли не совпадают.';
            return;
        }
        if (!consent) {
            errEl.textContent = 'Нужно принять Политику конфиденциальности и Оферту.';
            return;
        }

        btn.disabled = true;
        const { data, error } = await signUp(email, password);
        btn.disabled = false;

        if (error) {
            errEl.textContent = humanizeAuthError(error);
            return;
        }

        if (data.session) {
            // «Confirm email» выключен в Supabase — сессия уже готова.
            hide();
            showToast('Регистрация завершена — добро пожаловать!', 'success');
            onAuthenticated(data.user);
            return;
        }

        // Сюда попадаем, только если в Supabase всё ещё включено
        // «Confirm email» — тогда сессии нет, а письмо со ссылкой ушло
        // на почту. Не ломаем флоу — просто подсказываем, что делать.
        errEl.textContent = 'Аккаунт создан, но не активен: проверьте почту и перейдите по ссылке из письма, либо выключите «Confirm email» в настройках Supabase.';
    });

    return { show, hide };
}

function humanizeAuthError(message) {
    const m = (message || '').toLowerCase();
    if (m.includes('already registered') || m.includes('already exists')) {
        return 'Этот email уже зарегистрирован — попробуйте войти.';
    }
    if (m.includes('invalid login credentials')) {
        return 'Неверный email или пароль.';
    }
    if (m.includes('email not confirmed')) {
        return 'Email ещё не подтверждён — проверьте почту или отключите подтверждение в Supabase.';
    }
    return message;
}
