// ===== КАТАЛОГ ТОВАРОВ =====
// Каталог — просто список объектов, редактируется прямо здесь. Сетка на
// странице строится из этого массива автоматически, включая разметку
// "bento" (первый товар — крупная карточка, остальные — уже) и стрелки
// количества/суммы (см. ui/catalogView.js).
//
// ЧТО ЗАПОЛНИТЬ ДЛЯ ТОВАРА:
//   id           — короткий уникальный код (используется в истории заказов).
//   icon         — ключ SVG-иконки карточки, см. ui/catalogIcons.js.
//   historyIcon  — эмодзи для компактной строки в истории заказов профиля.
//   name         — название товара.
//   description  — короткое описание (1 строка на карточке).
//   type         — 'unit' (цена за штуку × количество, напр. звёзды) или
//                  'topup' (сумма пополнения + комиссия сверху, напр. Steam).
//   currency     — символ валюты для отображения цены.
//   featured     — true у одного-двух товаров, чтобы карточка была крупнее.
//   checkoutUrl  — ссылка на страницу оплаты в платёжной системе. Пока не
//                  готова — оставь null: кнопка «Купить» всё равно работает
//                  (ведёт в Telegram-бота, чтобы принять заказ вручную), но
//                  как только ссылка появится, оплата откроется прямо на сайте.
//
// Для type: 'unit' дополнительно:
//   pricePerUnit, minQty, maxQty, step, defaultQty, quickAmounts
// Для type: 'topup' дополнительно:
//   feePercent, minAmount, maxAmount, step, defaultAmount, quickAmounts
//
// quickAmounts — ровно 4 значения для чипов быстрого выбора суммы в модалке
// покупки (см. ui/buyModal.js) — то, что обычно предлагают Steam/App Store.
//
// СИНХРОНИЗАЦИЯ С MINI APP: держи такой же список (или общий JSON) в
// проекте mini app — тогда каталог на сайте и в Telegram не разъедутся.
export const CATALOG = [
    {
        id: 'steam',
        icon: 'steam',
        historyIcon: '🎮',
        name: 'Пополнение Steam',
        description: 'Моментальное пополнение баланса Steam-кошелька, любая сумма.',
        type: 'topup',
        currency: '₽',
        feePercent: 6, // комиссия сервиса, накидывается сверху введённой суммы
        minAmount: 100,
        maxAmount: 15000,
        step: 100,
        defaultAmount: 500,
        quickAmounts: [300, 500, 1000, 2000],
        checkoutUrl: null, // TODO: вставь ссылку на оплату этого товара
        featured: true,
    },
    {
        id: 'stars',
        icon: 'stars',
        historyIcon: '⭐',
        name: 'Telegram Stars',
        description: 'Моментальная доставка Telegram Stars на аккаунт или в подарок.',
        type: 'unit',
        currency: '₽',
        pricePerUnit: 1.49, // цена за 1 звезду
        minQty: 50,
        maxQty: 10000,
        step: 25,
        defaultQty: 50,
        quickAmounts: [50, 100, 250, 500],
        checkoutUrl: null, // TODO: вставь ссылку на оплату этого товара
        featured: false,
    },
];
