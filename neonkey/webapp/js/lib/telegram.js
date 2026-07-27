// ===== ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP И ПРОВЕРКА АВТОРИЗАЦИИ =====
export const tg = window.Telegram.WebApp;

/**
 * Возвращает объект пользователя Telegram или null, если приложение
 * открыто не из Telegram (нет initData).
 */
export function getTelegramUser() {
    return tg.initDataUnsafe?.user || null;
}

/**
 * Показывает overlay "Требуется авторизация" и прячет приложение.
 * Возвращает true, если пользователь авторизован и можно продолжать запуск.
 */
export function requireAuth() {
    const user = getTelegramUser();
    const authOverlay = document.getElementById('authOverlay');
    const authRetryBtn = document.getElementById('authRetryBtn');
    const app = document.getElementById('app');

    if (!user) {
        authOverlay.classList.remove('hidden');
        app.style.display = 'none';
        authRetryBtn.addEventListener('click', () => location.reload());
        return null;
    }

    authOverlay.classList.add('hidden');
    app.style.display = 'block';
    console.log('✅ Пользователь авторизован:', user);
    return user;
}
