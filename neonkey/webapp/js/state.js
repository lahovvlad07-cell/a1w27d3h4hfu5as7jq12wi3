// ===== ОБЩЕЕ СОСТОЯНИЕ ПРИЛОЖЕНИЯ =====
// Единый объект состояния, на который ссылаются все модули.
// Важно: модули не должны делать `let state = ...` у себя — только
// изменять свойства этого объекта (state.settings = ...), иначе
// изменения не будут видны в других файлах.
export const state = {
    user: null,           // Telegram-пользователь
    appData: { avatar: '👤', orders: [], consent: false, balance: 0 },
    settings: {},
    currentProduct: 'steam',
    calculatedPrice: 0,
    depositCrypto: 'USDT',
};
