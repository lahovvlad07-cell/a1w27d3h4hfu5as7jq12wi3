// ===== АДМИНКА (вкладка «Админка», видна только @nellmet) =====
// Показ вкладки — чисто косметическая проверка (isAdminUser), настоящая
// защита — в Row Level Security таблицы pricing_config (см.
// supabase/pricing_config.sql): даже если кто-то откроет вкладку через
// консоль браузера, сохранить изменения сможет только реальный @nellmet —
// Supabase отклонит запрос на уровне базы.
import { CATALOG } from '../data/catalog.js';
import { updatePricingConfig } from '../lib/pricingConfig.js';
import { renderCatalog } from './catalogView.js';
import { showToast } from './toast.js';

export function initAdminPanel() {
    const tabBtn = document.getElementById('adminTabBtn');
    const steamFeeInput = document.getElementById('adminSteamFee');
    const steamMinInput = document.getElementById('adminSteamMin');
    const steamSaveBtn = document.getElementById('adminSteamSave');
    const starsPriceInput = document.getElementById('adminStarsPrice');
    const starsMinInput = document.getElementById('adminStarsMin');
    const starsSaveBtn = document.getElementById('adminStarsSave');

    function fillFromCatalog() {
        const steam = CATALOG.find((i) => i.id === 'steam');
        const stars = CATALOG.find((i) => i.id === 'stars');
        if (steam) {
            steamFeeInput.value = steam.feePercent;
            steamMinInput.value = steam.minAmount;
        }
        if (stars) {
            starsPriceInput.value = stars.pricePerUnit;
            starsMinInput.value = stars.minQty;
        }
    }

    function setVisible(visible) {
        tabBtn.classList.toggle('hidden', !visible);
        if (visible) fillFromCatalog();
    }

    steamSaveBtn.addEventListener('click', async () => {
        const feePercent = Number(steamFeeInput.value);
        const minAmount = Number(steamMinInput.value);
        if (!Number.isFinite(feePercent) || feePercent < 0 || !Number.isFinite(minAmount) || minAmount <= 0) {
            showToast('Проверьте значения — комиссия и минимум должны быть положительными числами', 'error');
            return;
        }

        const { error } = await updatePricingConfig({ steam_fee_percent: feePercent, steam_min_amount: minAmount });
        if (error) { showToast(`Не удалось сохранить: ${error}`, 'error'); return; }

        const steam = CATALOG.find((i) => i.id === 'steam');
        if (steam) {
            steam.feePercent = feePercent;
            steam.minAmount = minAmount;
            if (steam.defaultAmount < minAmount) steam.defaultAmount = minAmount;
            if (steam.quickAmounts) steam.quickAmounts = steam.quickAmounts.map((v) => Math.max(v, minAmount));
        }
        renderCatalog();
        showToast('Цены на пополнение Steam обновлены', 'success');
    });

    starsSaveBtn.addEventListener('click', async () => {
        const pricePerUnit = Number(starsPriceInput.value);
        const minQty = Number(starsMinInput.value);
        if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0 || !Number.isFinite(minQty) || minQty <= 0) {
            showToast('Проверьте значения — цена и минимум должны быть положительными числами', 'error');
            return;
        }

        const { error } = await updatePricingConfig({ stars_price_per_unit: pricePerUnit, stars_min_qty: minQty });
        if (error) { showToast(`Не удалось сохранить: ${error}`, 'error'); return; }

        const stars = CATALOG.find((i) => i.id === 'stars');
        if (stars) {
            stars.pricePerUnit = pricePerUnit;
            stars.minQty = minQty;
            if (stars.defaultQty < minQty) stars.defaultQty = minQty;
            if (stars.quickAmounts) stars.quickAmounts = stars.quickAmounts.map((v) => Math.max(v, minQty));
        }
        renderCatalog();
        showToast('Цены на Telegram Stars обновлены', 'success');
    });

    return { setVisible };
}
