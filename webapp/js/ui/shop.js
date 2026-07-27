// ===== ОТОБРАЖЕНИЕ ЦЕН В МАГАЗИНЕ =====
import { state } from '../state.js';
import { withDefaults } from '../api/settings.js';

export function updatePricesDisplay(product) {
    const settings = withDefaults(state.settings);
    const steamPriceEl = document.getElementById('steamPriceDisplay');
    const starsPriceEl = document.getElementById('starsPriceDisplay');
    if (steamPriceEl) steamPriceEl.textContent = `от ${settings.steam_min} ₽`;
    if (starsPriceEl) starsPriceEl.textContent = `от ${settings.stars_min} Stars`;

    const orderMinValue = document.getElementById('orderMinValue');
    if (orderMinValue) {
        const min = (product === 'steam' || state.currentProduct === 'steam') ? settings.steam_min : settings.stars_min;
        orderMinValue.textContent = min;
    }
}
