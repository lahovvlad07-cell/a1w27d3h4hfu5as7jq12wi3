// ===== КЛЮЧ-КАРТА (сигнатурный элемент hero) =====
// Лёгкий 3D-наклон карты за курсором (только десктоп, только если
// пользователь не просил уменьшить анимации) + мелкая деталь:
// "код доступа" меняется на случайный при каждой загрузке, чтобы
// карта выглядела как настоящий выпущенный ключ, а не статичная картинка.
const HEX = '0123456789ABCDEF';

function randomAccessCode() {
    let out = '';
    for (let i = 0; i < 4; i++) out += HEX[Math.floor(Math.random() * HEX.length)];
    return `•••• •••• ${out}`;
}

export function initKeycard() {
    const codeEl = document.getElementById('keycardCode');
    if (codeEl) codeEl.textContent = randomAccessCode();

    const card = document.getElementById('keycard');
    if (!card) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    if (prefersReducedMotion || !isFinePointer) return;

    const stage = card.closest('.keycard-stage');
    if (!stage) return;

    const MAX_DEG = 8;

    stage.addEventListener('mousemove', (e) => {
        const rect = stage.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width; // 0..1
        const py = (e.clientY - rect.top) / rect.height;
        const ry = (px - 0.5) * MAX_DEG * 2; // rotateY
        const rx = (0.5 - py) * MAX_DEG * 2; // rotateX
        card.style.setProperty('--rx', `${ry}deg`);
        card.style.setProperty('--ry', `${rx}deg`);
    });

    stage.addEventListener('mouseleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
    });
}
