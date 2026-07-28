// ===== АДМИН-ВКЛАДКА =====
import { state } from '../state.js';
import { saveSettings } from '../api/settings.js';
import { loadOrdersByStatus, loadProcessedOrders, updateOrderStatus } from '../api/orders.js';
import { updatePricesDisplay } from './shop.js';
import { confirmAdminAction } from './adminConfirm.js';
import { showToast } from './toast.js';

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

const PAGE_SIZE = 5;
let pendingPage = 0;

const STATUS_MAP = {
    pending: '<span class="order-status pending">⏳ Ожидает</span>',
    completed: '<span class="order-status completed">✅ Выполнен</span>',
    canceled: '<span class="order-status canceled">❌ Отклонён</span>',
};

function orderItemHtml(order, { withActions }) {
    const statusText = STATUS_MAP[order.status] || order.status;
    const actions = withActions ? `
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
}

export function initAdminOrdersPagination() {
    document.getElementById('adminOrdersPrev').addEventListener('click', () => {
        if (pendingPage > 0) {
            pendingPage -= 1;
            renderAdminOrders();
        }
    });
    document.getElementById('adminOrdersNext').addEventListener('click', () => {
        pendingPage += 1;
        renderAdminOrders();
    });
}

// Заказы "в ожидании" — отдельная очередь с постраничной навигацией
// (5 на страницу), чтобы старый необработанный заказ никогда не
// пропадал из виду из-за более новых заказов. Как только заказ
// обработан (выполнен/отклонён), он покидает эту очередь сам —
// см. renderProcessedOrders() ниже.
export async function renderAdminOrders() {
    const container = document.getElementById('adminOrdersList');
    const pagination = document.getElementById('adminOrdersPagination');
    container.innerHTML = 'Загрузка...';

    const { orders, total } = await loadOrdersByStatus('pending', { limit: PAGE_SIZE, offset: pendingPage * PAGE_SIZE });

    // Если на текущей странице пусто (например, обработали последний
    // заказ последней страницы) — откатываемся на страницу назад.
    if (orders.length === 0 && pendingPage > 0) {
        pendingPage -= 1;
        return renderAdminOrders();
    }

    if (total === 0) {
        container.innerHTML = '<div class="text-muted-sm admin-loading-placeholder">Нет заказов в ожидании</div>';
        pagination.classList.add('hidden');
        renderProcessedOrders();
        return;
    }

    container.innerHTML = orders.map((order) => orderItemHtml(order, { withActions: true })).join('');

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    pagination.classList.toggle('hidden', totalPages <= 1);
    document.getElementById('adminOrdersPageLabel').textContent = `Стр. ${pendingPage + 1} из ${totalPages}`;
    document.getElementById('adminOrdersPrev').disabled = pendingPage === 0;
    document.getElementById('adminOrdersNext').disabled = pendingPage >= totalPages - 1;

    container.querySelectorAll('[data-action="complete"]').forEach((btn) => {
        btn.addEventListener('click', async function () {
            const confirmed = await confirmAdminAction('Вы уверены, что хотите отметить заказ как выполненный?');
            if (!confirmed) return;
            const { success, error } = await updateOrderStatus(this.dataset.orderId, 'completed');
            if (success) {
                showToast('Заказ отмечен как выполненный', 'success');
                renderAdminOrders();
                renderProcessedOrders();
            } else {
                showToast(`Не удалось обновить статус: ${error || 'см. консоль'}`, 'error', 4500);
            }
        });
    });

    container.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
        btn.addEventListener('click', async function () {
            const confirmed = await confirmAdminAction('Вы уверены, что хотите отклонить заказ?');
            if (!confirmed) return;
            const { success, error } = await updateOrderStatus(this.dataset.orderId, 'canceled');
            if (success) {
                showToast('Заказ отклонён', 'success');
                renderAdminOrders();
                renderProcessedOrders();
            } else {
                showToast(`Не удалось обновить статус: ${error || 'см. консоль'}`, 'error', 4500);
            }
        });
    });

    renderProcessedOrders();
}

/** Последние обработанные заказы — только для справки, без действий и без пагинации. */
export async function renderProcessedOrders() {
    const container = document.getElementById('adminProcessedList');
    container.innerHTML = 'Загрузка...';
    const orders = await loadProcessedOrders(5);
    if (!orders || orders.length === 0) {
        container.innerHTML = '<div class="text-muted-sm admin-loading-placeholder">Пока ничего не обработано</div>';
        return;
    }
    container.innerHTML = orders.map((order) => orderItemHtml(order, { withActions: false })).join('');
}
