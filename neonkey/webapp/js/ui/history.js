// ===== ИСТОРИЯ ЗАКАЗОВ (ПРОФИЛЬ) =====
import { state } from '../state.js';

export function renderHistory() {
    const historyList = document.getElementById('historyList');
    const historyEmpty = document.getElementById('historyEmpty');
    const orders = state.appData.orders || [];

    if (orders.length === 0) {
        historyList.innerHTML = '';
        historyEmpty.style.display = 'flex';
        return;
    }

    historyEmpty.style.display = 'none';
    const lastFive = orders.slice(-5).reverse();
    historyList.innerHTML = lastFive.map((order) => {
        const cleanName = order.productName.replace(/[🎮⭐]\s*/, '').trim();
        let icon = '';
        if (order.productName.includes('Steam')) icon = '🎮';
        else if (order.productName.includes('Stars')) icon = '⭐';
        return `
            <div class="history-item">
                <span class="product-name">
                    ${icon ? `<span class="product-icon-small">${icon}</span>` : ''}
                    ${cleanName}
                </span>
                <span class="order-date">${order.date}</span>
                <span class="order-amount">${order.amount}</span>
            </div>
        `;
    }).join('');
}
