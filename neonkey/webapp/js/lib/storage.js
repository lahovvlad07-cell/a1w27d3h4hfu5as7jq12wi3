// ===== ЛОКАЛЬНОЕ ХРАНИЛИЩЕ (ЗАПАСНОЙ ВАРИАНТ, ЕСЛИ SUPABASE НЕДОСТУПЕН) =====
import { LOCAL_STORAGE_KEYS } from '../config.js';

export function getDefaultData() {
    return { avatar: '👤', orders: [], balance: 0 };
}

export function loadLocalData() {
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.data);
        if (raw) return JSON.parse(raw);
    } catch (e) {
        console.warn('Не удалось прочитать локальные данные', e);
    }
    return null;
}

export function saveLocalData(data) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.data, JSON.stringify(data));
}

export function loadLocalConsent() {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.consent) === 'true';
}

export function saveLocalConsent(val) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.consent, String(val));
}
