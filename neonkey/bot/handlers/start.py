from telegram import Update
from telegram.ext import ContextTypes

from keyboards import shop_keyboard

WELCOME_TEXT = (
    "Добро пожаловать в NeonKey!\n\n"
    "🎮 Пополнение Steam\n"
    "⭐ Telegram Stars\n\n"
    "🛒 Каталог и оплата — на сайте (кнопка ниже).\n"
    "👤 Личный кабинет (профиль, история заказов) — прямо здесь, в Telegram."
)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(WELCOME_TEXT, reply_markup=shop_keyboard())
