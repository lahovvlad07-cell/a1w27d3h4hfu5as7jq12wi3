"""Инлайн-клавиатуры бота, вынесены отдельно, чтобы переиспользовать
в нескольких хендлерах по мере роста бота (например, в будущих
/help, /support и т.д.)."""
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from config import SHOP_URL, SITE_URL


def shop_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        # Обычная ссылка (url=), НЕ web_app= — открывается в браузере/
        # встроенном браузере Telegram, а не как мини-апп. Каталог и
        # оплата физически живут только на сайте.
        [InlineKeyboardButton("🛒 Открыть каталог", url=SITE_URL)],
        # web_app= — это и есть мини-апп: тут только личный кабинет
        # (профиль, способы входа, история заказов), без каталога.
        [InlineKeyboardButton("👤 Личный кабинет", web_app={"url": SHOP_URL})],
    ])
