from telegram import Update
from telegram.ext import ContextTypes

from keyboards import shop_keyboard

WELCOME_TEXT = (
    "Добро пожаловать в NeonKey!\n\n"
    "🎮 Пополнение Steam\n"
    "⭐ Telegram Stars\n\n"
    "Нажми кнопку ниже, чтобы открыть магазин:"
)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(WELCOME_TEXT, reply_markup=shop_keyboard())
