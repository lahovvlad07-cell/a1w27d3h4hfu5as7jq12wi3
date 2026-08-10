// ===== SCROLL REVEAL =====
// Лёгкая обёртка над IntersectionObserver: добавляет .is-visible
// элементам с классом .reveal / .reveal-stagger, когда они попадают
// во вьюпорт. Анимации самих классов описаны в css/animations.css.
export function initScrollReveal(selector = '.reveal, .reveal-stagger') {
    const targets = document.querySelectorAll(selector);
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
        targets.forEach((el) => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.18, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach((el) => observer.observe(el));
}
