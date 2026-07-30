// ===== БАННЕР МИГРАЦИИ =====
// ПРИМЕЧАНИЕ: в исходном проекте разметка и стили для баннера были,
// а JS-логики не было вообще — баннер никогда не показывался и кнопка
// закрытия ничего не делала (мёртвый код). Здесь он полноценно работает
// и управляется флагом MIGRATION_BANNER.enabled в config.js.
import { MIGRATION_BANNER, LOCAL_STORAGE_KEYS } from '../config.js';

export function initMigrationBanner() {
    const banner = document.getElementById('migrationBanner');
    const closeBtn = document.getElementById('bannerCloseBtn');
    const countdownEl = document.getElementById('countdownDays');
    if (!banner) return;

    if (!MIGRATION_BANNER.enabled) {
        banner.classList.add('hidden');
        return;
    }

    const dismissed = localStorage.getItem(LOCAL_STORAGE_KEYS.bannerDismissed) === 'true';
    if (dismissed) {
        banner.classList.add('hidden');
        return;
    }

    if (countdownEl) countdownEl.textContent = String(MIGRATION_BANNER.days);
    banner.classList.remove('hidden');

    closeBtn?.addEventListener('click', () => {
        banner.classList.add('hidden');
        localStorage.setItem(LOCAL_STORAGE_KEYS.bannerDismissed, 'true');
    });
}
