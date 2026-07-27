import logging

from telegram.ext import Application, CommandHandler

from config import BOT_TOKEN
from handlers.start import start

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


def main():
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))

    # ===== СЮДА ДОБАВЛЯЙ НОВЫЕ ХЕНДЛЕРЫ ПО МЕРЕ РОСТА БОТА =====
    # Например:
    # from handlers.support import support
    # app.add_handler(CommandHandler("support", support))

    print("✅ Бот NeonKey запущен!")
    app.run_polling()


if __name__ == "__main__":
    main()
