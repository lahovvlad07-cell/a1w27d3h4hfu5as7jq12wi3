// ===== СОГЛАСИЕ С ПОЛИТИКАМИ =====
import { state } from '../state.js';
import { tg } from '../lib/telegram.js';
import { saveLocalConsent, loadLocalData, getDefaultData } from '../lib/storage.js';
import { saveProfileToSupabase, deleteProfile } from '../api/profile.js';
import { loadSettings } from '../api/settings.js';

/**
 * @param {Object} callbacks
 * @param {Function} callbacks.onAccepted - вызывается после успешного принятия согласия
 * @param {Function} callbacks.onNeedsAvatar - вызывается, если у пользователя ещё нет аватара
 */
export function initConsentFlow({ onAccepted, onNeedsAvatar }) {
    const consentOverlay = document.getElementById('consentOverlay');
    const consentForm = document.getElementById('consentForm');
    const consentDenied = document.getElementById('consentDenied');
    const consentFinalDenied = document.getElementById('consentFinalDenied');
    const consentBox = document.querySelector('.consent-box');

    if (state.appData.consent) {
        consentOverlay.classList.add('hidden');
        console.log('Согласие уже принято');
        onAccepted();
    } else {
        consentOverlay.classList.remove('hidden');
        consentForm.classList.remove('u-hidden');
        consentDenied.classList.add('u-hidden');
        consentFinalDenied.classList.add('u-hidden');
        console.log('Показываем оверлей согласия');
    }

    if (!consentBox) {
        console.warn('Элемент .consent-box не найден');
        return;
    }

    consentBox.addEventListener('click', (e) => {
        const target = e.target;

        if (target.id === 'consentCheck') {
            const acceptBtn = document.getElementById('consentAccept');
            if (acceptBtn) acceptBtn.disabled = !target.checked;
            return;
        }
        if (target.id === 'consentAccept' || target.closest('#consentAccept')) {
            const btn = target.id === 'consentAccept' ? target : target.closest('#consentAccept');
            if (btn && !btn.disabled) handleConsentAccept();
            return;
        }
        if (target.id === 'consentDecline' || target.closest('#consentDecline')) {
            handleConsentDecline();
            return;
        }
        if (target.id === 'consentRetry' || target.closest('#consentRetry')) {
            handleConsentRetry();
            return;
        }
        if (target.id === 'consentFinalDecline' || target.closest('#consentFinalDecline')) {
            handleConsentFinalDecline();
            return;
        }
        if (target.id === 'consentReload' || target.closest('#consentReload')) {
            window.location.reload();
            return;
        }
    });

    async function handleConsentAccept() {
        const check = document.getElementById('consentCheck');
        if (!check || !check.checked) {
            tg.showAlert('Пожалуйста, поставьте галочку, чтобы принять условия.');
            return;
        }
        saveLocalConsent(true);
        state.appData.consent = true;
        const localData = loadLocalData() || getDefaultData();
        await saveProfileToSupabase(state.user.id, {
            avatar: localData.avatar || '👤',
            orders: localData.orders || [],
            consent: true,
            balance: localData.balance || 0,
        });
        state.settings = (await loadSettings()) || {};
        consentOverlay.classList.add('hidden');
        onAccepted();

        if (!state.appData.avatar || state.appData.avatar === '👤') {
            onNeedsAvatar();
        }
    }

    async function handleConsentDecline() {
        await deleteProfile(state.user.id);
        consentForm.classList.add('u-hidden');
        consentDenied.classList.remove('u-hidden');
        consentFinalDenied.classList.add('u-hidden');
    }

    function handleConsentRetry() {
        consentDenied.classList.add('u-hidden');
        consentForm.classList.remove('u-hidden');
        consentFinalDenied.classList.add('u-hidden');
    }

    async function handleConsentFinalDecline() {
        await deleteProfile(state.user.id);
        consentDenied.classList.add('u-hidden');
        consentFinalDenied.classList.remove('u-hidden');
    }
}
