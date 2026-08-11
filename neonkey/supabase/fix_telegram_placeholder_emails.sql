-- ===== РАЗОВАЯ МИГРАЦИЯ: ПОЧИНИТЬ СТАРЫЕ SLUZHEBNYE EMAIL TELEGRAM-АККАУНТОВ =====
-- Выполни ОДИН РАЗ в Supabase → SQL Editor → New query → Run, ПОСЛЕ того как
-- передеплоишь telegram-auth с обновлённым _shared/telegram.ts (или
-- index.dashboard.ts, если правишь через веб-редактор).
--
-- Зачем: аккаунты, созданные через вход по Telegram ДО этой правки, получили
-- служебный email вида tg-<id>@telegram.neonkey.local. Зона .local
-- зарезервирована под mDNS, и Supabase Auth считает такой email
-- недоставляемым — из-за этого попытка привязать настоящий email через
-- кнопку "Привязать email" в профиле падает с ошибкой вида:
--   Email address "tg-6048486427@telegram.neonkey.local" is invalid
-- (Supabase проверяет ТЕКУЩИЙ email при любом обновлении, не только новый.)
--
-- Этот скрипт просто меняет домен в email у всех уже существующих таких
-- аккаунтов на telegram.neonkey.app (или на тот, что ты указал в
-- telegramPlaceholderEmail() — если меняешь домен, поменяй его и в запросе
-- ниже). Сам Telegram-вход при этом не затрагивается, письма никогда не
-- отправлялись и не отправятся — это чисто служебное поле.
update auth.users
set email = replace(email, '@telegram.neonkey.local', '@telegram.neonkey.app')
where email like '%@telegram.neonkey.local';
