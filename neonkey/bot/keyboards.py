"""Инлайн-клавиатуры бота, вынесены отдельно, чтобы переиспользовать
в нескольких хендлерах по мере роста бота (например, в будущих
/help, /support и т.д.)."""
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

from config import SHOP_URL


def shop_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("🛒 Открыть магазин", web_app={"url": SHOP_URL})]
    ])
