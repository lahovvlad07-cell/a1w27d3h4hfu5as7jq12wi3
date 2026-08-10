// =========================================================
// «Живая» пульс-линия в hero.
// — Форма при заходе на сайт каждый раз генерируется заново
//   (не один и тот же зигзаг), затем линия бесшовно переходит
//   в непрерывное движение влево.
// — Импульсы во время движения тоже случайны: высота, ширина,
//   иногда маленький предимпульс — рисунок не повторяется.
// — Пока панель вне экрана или вкладка неактивна, rAF-цикл
//   полностью останавливается (а не просто "простаивает"),
//   чтобы не тратить кадры впустую.
// =========================================================
export function initPulseLine() {
    const svg = document.querySelector('.pulse-svg');
    const line = document.querySelector('.pulse-line');
    const lineBg = document.querySelector('.pulse-line-bg');
    if (!svg || !line) return;

    const VB_W = 320;
    const BASE_Y = 45;
    const SPEED = 46; // условных единиц viewBox в секунду
    const rand = (min, max) => min + Math.random() * (max - min);

    // ---------- Генератор формы: один и тот же алгоритм и для
    // стартового рисунка, и для того, что дорисовывается на лету.
    // cursor — объект { x }, мутируется на месте. ----------
    function pushNext(points, cursor) {
        cursor.x += rand(55, 130);

        if (Math.random() < 0.4) {
            points.push({ x: cursor.x, y: BASE_Y + rand(-1, 1) });
            return;
        }
        if (Math.random() < 0.3) {
            cursor.x += rand(8, 14);
            points.push({ x: cursor.x, y: BASE_Y - rand(4, 9) });
            cursor.x += rand(6, 10);
            points.push({ x: cursor.x, y: BASE_Y });
        }
        cursor.x += rand(14, 24);
        points.push({ x: cursor.x, y: BASE_Y - rand(22, 40) });
        cursor.x += rand(14, 24);
        points.push({ x: cursor.x, y: BASE_Y + rand(16, 36) });
        cursor.x += rand(14, 24);
        points.push({ x: cursor.x, y: BASE_Y });
    }

    function toPathD(points, offsetX) {
        const parts = new Array(points.length);
        for (let i = 0; i < points.length; i++) {
            const p = points[i];
            parts[i] = `${i === 0 ? 'M' : 'L'}${(p.x - offsetX).toFixed(1)},${p.y.toFixed(1)}`;
        }
        return parts.join(' ');
    }

    // ---------- Случайная стартовая форма (своя при каждой загрузке) ----------
    const initialPoints = [{ x: 0, y: BASE_Y }];
    const cursor = { x: 0 };
    while (cursor.x < 250) pushNext(initialPoints, cursor);
    if (initialPoints[initialPoints.length - 1].x < VB_W) {
        initialPoints.push({ x: VB_W, y: BASE_Y });
    }

    const initialD = toPathD(initialPoints, 0);
    line.setAttribute('d', initialD);
    if (lineBg) lineBg.setAttribute('d', initialD);

    // Длина конкретного пути не фиксирована (форма каждый раз своя),
    // поэтому dasharray/dashoffset для эффекта "рисования" считаем
    // динамически, а не берём захардкоженное число.
    let drawLength = 620;
    try {
        drawLength = line.getTotalLength();
    } catch { /* оставляем запасное значение */ }
    line.style.strokeDasharray = String(drawLength);
    line.style.strokeDashoffset = String(drawLength);

    // Уважаем настройку "меньше анимаций" — оставляем статичный (но по-прежнему
    // случайный при каждой загрузке) рисунок, без непрерывного движения.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ---------- Живой режим: бесконечная прокрутка со случайными импульсами ----------
    const points = initialPoints;
    const genCursor = { x: points[points.length - 1].x };
    let scrollX = 0;
    let visible = true;
    let tabVisible = !document.hidden;
    let loopActive = false;
    let lastTime = 0;

    function frame(now) {
        const dt = Math.min(now - lastTime, 100) / 1000;
        lastTime = now;

        scrollX += SPEED * dt;
        while (genCursor.x - scrollX < VB_W + 60) pushNext(points, genCursor);
        while (points.length > 2 && points[1].x - scrollX < -30) points.shift();

        line.setAttribute('d', toPathD(points, scrollX));

        if (visible && tabVisible) {
            requestAnimationFrame(frame);
        } else {
            loopActive = false;
        }
    }

    function resumeLoop() {
        if (loopActive || !visible || !tabVisible) return;
        loopActive = true;
        lastTime = performance.now();
        requestAnimationFrame(frame);
    }

    function start() {
        line.classList.add('is-live');
        // .is-live в CSS выключает dasharray/dashoffset, но инлайновые стили,
        // которые мы сами проставили выше для эффекта "рисования", имеют более
        // высокий приоритет и перекрывали бы это правило. Из-за этого на новых,
        // более длинных участках пути (уже в "живом" режиме) обводки не хватало —
        // визуально график обрывался/пропадал, не дорисовавшись до конца.
        // Явно снимаем инлайновые значения, чтобы правило из CSS применилось.
        line.style.strokeDasharray = '';
        line.style.strokeDashoffset = '';
        resumeLoop();
    }

    // Ждём завершения анимации "рисования" при загрузке...
    line.addEventListener('animationend', start, { once: true });
    // ...и подстраховываемся на случай, если событие не придёт
    // (например, если анимация уже была отключена стилями).
    setTimeout(start, 2600);

    // Полностью останавливаем/возобновляем rAF-цикл, а не просто
    // пропускаем в нём работу — так вкладка в фоне и панель за пределами
    // экрана не расходуют кадры вообще.
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                visible = entry.isIntersecting;
                if (visible) resumeLoop();
            });
        }, { threshold: 0.05 });
        io.observe(svg);
    }
    document.addEventListener('visibilitychange', () => {
        tabVisible = !document.hidden;
        if (tabVisible) resumeLoop();
    });
}
