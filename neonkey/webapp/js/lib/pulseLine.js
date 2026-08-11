// =========================================================
// «Живая» пульс-линия в hero.
// — Форма при заходе на сайт каждый раз генерируется заново,
//   рисуется гарантированно от начала (x=0), затем бесшовно
//   переходит в непрерывное движение влево.
// — Импульсы во время движения случайны: высота, ширина,
//   иногда маленький предимпульс — рисунок не повторяется.
// — Серая фоновая линия всегда обновляется ТЕМ ЖЕ путём, что и
//   цветная (см. setD ниже) — иначе фон рисуется один раз при
//   старте и больше не двигается, из-за чего остаётся "призрак"
//   исходной формы, пока цветная линия едет поверх сама по себе.
// — Пока панель вне экрана или вкладка неактивна, rAF-цикл
//   полностью останавливается, а не просто простаивает.
// =========================================================
export function initPulseLine() {
    const svg = document.querySelector('.pulse-svg');
    const line = document.querySelector('.pulse-line');
    const lineBg = document.querySelector('.pulse-line-bg');
    if (!svg || !line) return;

    const VB_W = 320;
    const BASE_Y = 45;
    const SPEED = 46; // условных единиц viewBox в секунду
    const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const rand = (min, max) => min + Math.random() * (max - min);

    // ---------- Генератор формы: один алгоритм и для стартового
    // рисунка, и для того, что дорисовывается на лету во время
    // прокрутки. cursor — объект { x }, мутируется на месте. ----------
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

    // Обновляет ОБЕ линии одним и тем же путём — цветную поверх и серую
    // подложку под ней — чтобы вторая никогда не отставала/не застревала.
    function setD(d) {
        line.setAttribute('d', d);
        if (lineBg) lineBg.setAttribute('d', d);
    }

    // ---------- Случайная стартовая форма (своя при каждой загрузке),
    // всегда начинается ровно в x=0 ----------
    const initialPoints = [{ x: 0, y: BASE_Y }];
    const cursor = { x: 0 };
    while (cursor.x < 250) pushNext(initialPoints, cursor);
    if (initialPoints[initialPoints.length - 1].x < VB_W) {
        initialPoints.push({ x: VB_W, y: BASE_Y });
    }
    setD(toPathD(initialPoints, 0));

    // Отключаем CSS-анимацию рисования — длина пути каждый раз своя
    // (форма случайна), поэтому дорисовываем через Web Animations API,
    // где "от какого значения" анимировать задаём явно, без гонки с
    // таймингами стилей (раньше это и вызывало эффект "рисуется с
    // середины" при частой перезагрузке).
    line.style.animation = 'none';
    let drawLength = 620;
    try {
        drawLength = line.getTotalLength();
    } catch { /* оставляем запасное значение */ }
    line.style.strokeDasharray = String(drawLength);
    line.style.strokeDashoffset = String(drawLength);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let entranceDone = null;
    if (!reduceMotion && typeof line.animate === 'function') {
        const anim = line.animate(
            [{ strokeDashoffset: String(drawLength) }, { strokeDashoffset: '0' }],
            { duration: 1600, delay: 500, easing: EASE_OUT, fill: 'forwards' }
        );
        entranceDone = anim.finished.catch(() => {});
    } else {
        line.style.strokeDashoffset = '0';
    }

    // Уважаем настройку "меньше анимаций" — оставляем статичный (но по-прежнему
    // случайный при каждой загрузке) рисунок, без непрерывного движения.
    if (reduceMotion) return;

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

        setD(toPathD(points, scrollX));

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
        line.style.strokeDasharray = 'none';
        line.style.strokeDashoffset = '0';
        resumeLoop();
    }

    if (entranceDone) {
        entranceDone.then(start);
    } else {
        start();
    }
    // Подстраховка на случай, если Promise почему-то не сработает.
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
