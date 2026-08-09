// ===== ЭКРАН АВТОРИЗАЦИИ (вход / регистрация / код подтверждения) =====
// Заменяет старый дуэт "authOverlay" (только Telegram) + "consentOverlay"
// (согласие с политиками) одним общим экраном: он показывается, пока
// нет активной сессии Supabase Auth, и не пускает дальше без неё — вне
// зависимости от того, открыт сайт в браузере или в Telegram Mini App.
import {
    signUp,
    verifyEmailOtp,
    resendSignupCode,
    signInWithPassword,
    requestPasswordReset,
} from '../lib/auth.js';
import { showToast } from './toast.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initAuthScreen({ onAuthenticated }) {
    const overlay = document.getElementById('authOverlay');
    const stepLogin = document.getElementById('authStepLogin');
    const stepRegister = document.getElementById('authStepRegister');
    const stepVerify = document.getElementById('authStepVerify');

    let pendingEmail = '';
    let pendingPassword = '';

    function show() {
        overlay.classList.remove('hidden');
    }
    function hide() {
        overlay.classList.add('hidden');
    }
    function showStep(step) {
        [stepLogin, stepRegister, stepVerify].forEach((el) => el.classList.add('u-hidden'));
        step.classList.remove('u-hidden');
    }

    // ===== Переключение вкладок Вход / Регистрация =====
    document.getElementById('authGoRegister').addEventListener('click', () => showStep(stepRegister));
    document.getElementById('authGoLogin').addEventListener('click', () => showStep(stepLogin));
    document.getElementById('authBackFromVerify').addEventListener('click', () => showStep(stepRegister));

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
        const { error } = await signUp(email, password);
        btn.disabled = false;

        if (error) {
            errEl.textContent = humanizeAuthError(error);
            return;
        }

        pendingEmail = email;
        pendingPassword = password;
        document.getElementById('authVerifyEmailLabel').textContent = email;
        document.getElementById('authVerifyCode').value = '';
        document.getElementById('authVerifyError').textContent = '';
        showStep(stepVerify);
    });

    // ===== ПОДТВЕРЖДЕНИЕ КОДА =====
    const verifyForm = document.getElementById('authVerifyForm');
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('authVerifyCode').value.trim();
        const btn = document.getElementById('authVerifySubmit');
        const errEl = document.getElementById('authVerifyError');
        errEl.textContent = '';

        if (!code) {
            errEl.textContent = 'Введите код из письма.';
            return;
        }

        btn.disabled = true;
        const { data, error } = await verifyEmailOtp(pendingEmail, code);
        btn.disabled = false;

        if (error) {
            errEl.textContent = humanizeAuthError(error);
            return;
        }

        // verifyOtp обычно сразу создаёт сессию — но на случай, если её
        // почему-то нет, подстрахуемся обычным входом по паролю.
        let user = data.user;
        if (!user) {
            const signInResult = await signInWithPassword(pendingEmail, pendingPassword);
            user = signInResult.data?.user || null;
        }

        hide();
        showToast('Регистрация завершена — добро пожаловать!', 'success');
        onAuthenticated(user);
    });

    document.getElementById('authResendCode').addEventListener('click', async () => {
        if (!pendingEmail) return;
        const { error } = await resendSignupCode(pendingEmail);
        if (error) {
            showToast(`Не удалось отправить код повторно: ${error}`, 'error', 4000);
        } else {
            showToast('Код отправлен повторно', 'success');
        }
    });

    return { show, hide, showStep: () => showStep(stepLogin) };
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
        return 'Email ещё не подтверждён — введите код из письма.';
    }
    if (m.includes('token has expired') || m.includes('invalid') && m.includes('otp')) {
        return 'Код неверный или истёк — запросите новый.';
    }
    return message;
}
