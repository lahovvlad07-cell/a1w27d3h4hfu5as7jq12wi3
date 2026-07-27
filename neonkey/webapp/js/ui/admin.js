// ===== АДМИН-ВКЛАДКА =====
import { state } from '../state.js';
import { tg } from '../lib/telegram.js';
import { saveSettings } from '../api/settings.js';
import { loadOrders, updateOrderStatus } from '../api/orders.js';
import { updatePricesDisplay } from './shop.js';

export function showAdminTab(switchTab) {
    const bottomNav = document.getElementById('bottomNav');
    if (!bottomNav.querySelector('.nav-item[data-tab="admin"]')) {
        const adminNavItem = document.createElement('div');
        adminNavItem.className = 'nav-item';
        adminNavItem.dataset.tab = 'admin';
        adminNavItem.innerHTML = '<span class="nav-icon">🛠</span><span class="nav-label">Админ</span>';
        bottomNav.appendChild(adminNavItem);
        adminNavItem.addEventListener('click', () => switchTab('admin'));
    }
    console.log('Админ-вкладка добавлена');
}

export function loadAdminSettings() {
    const s = state.settings;
    const map = {
        admin_usdt_rate: s.usdt_rate,
        admin_ton_rate: s.ton_rate,
        admin_trx_rate: s.trx_rate,
        admin_stars_price: s.stars_price,
        admin_steam_price: s.steam_price,
        admin_steam_min: s.steam_min,
        admin_stars_min: s.stars_min,
    };
    Object.entries(map).forEach(([id, value]) => {
        if (value !== undefined && value !== null) {
            document.getElementById(id).value = value;
        }
    });
}

export function initAdminSettingsForm() {
    document.getElementById('adminSaveBtn').addEventListener('click', async () => {
        const newSettings = {
            usdt_rate: parseFloat(document.getElementById('admin_usdt_rate').value) || 0,
            ton_rate: parseFloat(document.getElementById('admin_ton_rate').value) || 0,
            trx_rate: parseFloat(document.getElementById('admin_trx_rate').value) || 0,
            stars_price: parseFloat(document.getElementById('admin_stars_price').value) || 0,
            steam_price: parseFloat(document.getElementById('admin_steam_price').value) || 0,
            steam_min: parseFloat(document.getElementById('admin_steam_min').value) || 0,
            stars_min: parseFloat(document.getElementById('admin_stars_min').value) || 0,
        };
        const statusEl = document.getElementById('adminStatus');
        statusEl.textContent = '⏳ Сохранение...';
        const { success, error } = await saveSettings(newSettings);
        if (success) {
            state.settings = newSettings;
            updatePricesDisplay(state.currentProduct);
            loadAdminSettings();
            statusEl.textContent = '✅ Настройки сохранены!';
            statusEl.style.color = '';
            setTimeout(() => { statusEl.textContent = ''; }, 3000);
        } else {
            statusEl.textContent = `❌ Ошибка сохранения: ${error || 'см. консоль'}`;
            statusEl.style.color = '#ff5566';
        }
    });
}

export async function renderAdminOrders() {
    const container = document.getElementById('adminOrdersList');
    container.innerHTML = 'Загрузка...';
    const orders = await loadOrders(5);
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div style="color: #667799; text-align: center; padding: 20px 0;">Нет заказов</div>';
        return;
    }

    const statusMap = {
        pending: '<span class="order-status pending">⏳ Ожидает</span>',
        completed: '<span class="order-status completed">✅ Выполнен</span>',
        canceled: '<span class="order-status canceled">❌ Отклонён</span>',
    };

    container.innerHTML = orders.map((order) => {
        const statusText = statusMap[order.status] || order.status;
        const actions = order.status === 'pending' ? `
            <div class="order-actions">
                <button class="btn-complete" data-order-id="${order.id}" data-action="complete">✅ Выполнить</button>
                <button class="btn-cancel" data-order-id="${order.id}" data-action="cancel">❌ Отклонить</button>
            </div>
        ` : '';
        return `
            <div class="admin-order-item">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    ${statusText}
                </div>
                <div class="order-details">
                    <strong>Товар:</strong> ${order.product === 'steam' ? '🎮 Steam' : '⭐ Stars'} &bull;
                    <strong>Сумма:</strong> ${order.amount} ${order.product === 'steam' ? '₽' : 'Stars'} &bull;
                    <strong>Цена:</strong> ${order.price_rub.toFixed(2)} ₽
                </div>
                <div class="order-details">
                    <strong>Аккаунт:</strong> ${order.account_data || '—'} &bull;
                    <strong>Дата:</strong> ${new Date(order.created_at).toLocaleString('ru-RU')}
                </div>
                ${actions}
            </div>
        `;
    }).join('');

    container.querySelectorAll('[data-action="complete"]').forEach((btn) => {
        btn.addEventListener('click', async function () {
            const confirmed = await confirmPopup('Вы уверены, что хотите отметить заказ как выполненный?');
            if (!confirmed) return;
            const { success, error } = await updateOrderStatus(this.dataset.orderId, 'completed');
            if (success) renderAdminOrders();
            else tg.showAlert(`Не удалось обновить статус: ${error || 'см. консоль'}`);
        });
    });

    container.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
        btn.addEventListener('click', async function () {
            const confirmed = await confirmPopup('Вы уверены, что хотите отклонить заказ?');
            if (!confirmed) return;
            const { success, error } = await updateOrderStatus(this.dataset.orderId, 'canceled');
            if (success) renderAdminOrders();
            else tg.showAlert(`Не удалось обновить статус: ${error || 'см. консоль'}`);
        });
    });
}

function confirmPopup(message) {
    return new Promise((resolve) => {
        tg.showPopup(
            { title: 'Подтверждение', message, buttons: [{ type: 'ok', text: 'Да' }, { type: 'cancel', text: 'Отмена' }] },
            (buttonId) => resolve(buttonId === 'ok')
        );
    });
}
