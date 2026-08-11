// ===== ЦЕНЫ, РЕДАКТИРУЕМЫЕ ИЗ АДМИНКИ =====
// Значения в data/catalog.js — это дефолты "из коробки". Если в Supabase
// создана таблица pricing_config (см. supabase/pricing_config.sql), при
// загрузке кабинета её значения подтягиваются и подменяют дефолты через
// applyPricingConfig() — прямо в объектах CATALOG, так что весь остальной
// код (catalogView.js, buyModal.js) ничего не знает про эту таблицу и
// работает с CATALOG как обычно.
//
// Если таблицу так и не завели — сайт просто продолжает работать на
// дефолтных цифрах из catalog.js, ничего не ломается.
import { supabaseClient } from './supabaseClient.js';

/** @returns {boolean} true, если это Telegram-аккаунт @nellmet — единственный,
 *  кому реально разрешено сохранять цены (проверка на сервере — через RLS
 *  в pricing_config.sql; это только для показа/скрытия вкладки «Админка»). */
export function isAdminUser(user) {
    const username = user?.user_metadata?.telegram_username;
    return typeof username === 'string' && username.toLowerCase() === 'nellmet';
}

/** Тянет текущие цены из Supabase. null, если таблицы ещё нет или запрос
 *  не удался — тогда просто остаёмся на дефолтах из catalog.js. */
export async function fetchPricingConfig() {
    if (!supabaseClient) return null;
    try {
        const { data, error } = await supabaseClient
            .from('pricing_config')
            .select('steam_fee_percent, steam_min_amount, steam_max_amount, stars_price_per_unit, stars_min_qty, stars_max_qty')
            .eq('id', 1)
            .maybeSingle();
        if (error || !data) return null;
        return {
            steamFeePercent: Number(data.steam_fee_percent),
            steamMinAmount: Number(data.steam_min_amount),
            steamMaxAmount: Number(data.steam_max_amount),
            starsPricePerUnit: Number(data.stars_price_per_unit),
            starsMinQty: Number(data.stars_min_qty),
            starsMaxQty: Number(data.stars_max_qty),
        };
    } catch {
        return null;
    }
}

/** Сохраняет цены в Supabase. fields — уже в именах колонок таблицы
 *  (steam_fee_percent, steam_min_amount, stars_price_per_unit, stars_min_qty). */
export async function updatePricingConfig(fields) {
    if (!supabaseClient) return { error: 'Supabase клиент не инициализирован' };
    const { error } = await supabaseClient
        .from('pricing_config')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', 1);
    return { error: error?.message || null };
}

/** Подставляет цены из Supabase поверх дефолтов прямо в объекты CATALOG. */
export function applyPricingConfig(catalog, config) {
    if (!config) return;

    const steam = catalog.find((item) => item.id === 'steam');
    if (steam) {
        if (Number.isFinite(config.steamFeePercent)) steam.feePercent = config.steamFeePercent;
        if (Number.isFinite(config.steamMinAmount)) steam.minAmount = config.steamMinAmount;
        if (Number.isFinite(config.steamMaxAmount)) steam.maxAmount = config.steamMaxAmount;
        if (steam.defaultAmount < steam.minAmount) steam.defaultAmount = steam.minAmount;
        if (steam.defaultAmount > steam.maxAmount) steam.defaultAmount = steam.maxAmount;
        if (steam.quickAmounts) steam.quickAmounts = steam.quickAmounts.map((v) => Math.min(steam.maxAmount, Math.max(v, steam.minAmount)));
    }

    const stars = catalog.find((item) => item.id === 'stars');
    if (stars) {
        if (Number.isFinite(config.starsPricePerUnit)) stars.pricePerUnit = config.starsPricePerUnit;
        if (Number.isFinite(config.starsMinQty)) stars.minQty = config.starsMinQty;
        if (Number.isFinite(config.starsMaxQty)) stars.maxQty = config.starsMaxQty;
        if (stars.defaultQty < stars.minQty) stars.defaultQty = stars.minQty;
        if (stars.defaultQty > stars.maxQty) stars.defaultQty = stars.maxQty;
        if (stars.quickAmounts) stars.quickAmounts = stars.quickAmounts.map((v) => Math.min(stars.maxQty, Math.max(v, stars.minQty)));
    }
}
