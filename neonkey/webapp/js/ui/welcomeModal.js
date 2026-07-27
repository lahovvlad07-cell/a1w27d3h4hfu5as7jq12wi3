// ===== МОДАЛЬНОЕ ОКНО ПРИВЕТСТВИЯ (для новых пользователей) =====
export function showWelcomeModal(onContinue) {
    const welcomeModal = document.getElementById('welcomeModal');
    const welcomeModalOverlay = document.getElementById('welcomeModalOverlay');
    const welcomeContinueBtn = document.getElementById('welcomeContinueBtn');

    function hide() {
        welcomeModal.classList.add('hidden');
        welcomeModalOverlay.classList.add('hidden');
    }

    welcomeModal.classList.remove('hidden');
    welcomeModalOverlay.classList.remove('hidden');

    // cloneNode чтобы не плодить повторные обработчики при повторных вызовах
    const newBtn = welcomeContinueBtn.cloneNode(true);
    welcomeContinueBtn.parentNode.replaceChild(newBtn, welcomeContinueBtn);
    newBtn.addEventListener('click', () => {
        hide();
        setTimeout(onContinue, 300);
    });
}
