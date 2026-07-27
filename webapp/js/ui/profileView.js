// ===== ЗАПОЛНЕНИЕ ПРОФИЛЯ (ИМЯ, ID, БАЛАНС, АВАТАР) =====
import { state } from '../state.js';

export function renderProfile() {
    const userName = document.getElementById('userName');
    const userIdEl = document.getElementById('userId');
    const avatarEl = document.getElementById('userAvatar');

    userName.textContent = state.user.first_name || 'Гость';
    userIdEl.textContent = '@' + (state.user.username || 'не указан');
    if (state.appData.avatar) avatarEl.textContent = state.appData.avatar;
    updateBalanceDisplay();
}

export function updateBalanceDisplay() {
    document.getElementById('balance').textContent = `${state.appData.balance.toFixed(2)} ₽`;
}
