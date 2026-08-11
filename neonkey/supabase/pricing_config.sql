-- ===== ТАБЛИЦА ЦЕН, РЕДАКТИРУЕМАЯ ИЗ АДМИНКИ =====
-- Выполни этот файл целиком в Supabase → SQL Editor → New query → Run.
-- Ничего дополнительно деплоить не нужно — это обычная таблица с
-- Row Level Security, никакой Edge Function для админки не требуется.
--
-- Как это работает:
--   - Читать цены может кто угодно, даже без входа (роли anon и
--     authenticated) — это нужно и для каталога в кабинете, и для
--     превью цен на главной странице ДО входа (см. webapp/js/main.js).
--     Цены — не приватные данные, поэтому открывать их анонимам
--     безопасно.
--   - Менять цены может только тот, кто вошёл Telegram-аккаунтом @nellmet
--     (сверяется по telegram_username в его профиле — см. telegram-link).
--   - Если поменять юзернейм администратора, поменяй 'nellmet' в двух
--     местах ниже (в обеих политиках) и выполни файл заново.

create table if not exists public.pricing_config (
    id int primary key default 1,
    steam_fee_percent numeric not null default 6,
    steam_min_amount numeric not null default 100,
    steam_max_amount numeric not null default 15000,
    stars_price_per_unit numeric not null default 1.49,
    stars_min_qty numeric not null default 50,
    stars_max_qty numeric not null default 10000,
    updated_at timestamptz not null default now(),
    constraint pricing_config_singleton check (id = 1)
);

-- Если таблица уже была создана раньше (до добавления полей "максимум") —
-- эти две команды безопасно дополнят её, ничего не потеряв.
alter table public.pricing_config add column if not exists steam_max_amount numeric not null default 15000;
alter table public.pricing_config add column if not exists stars_max_qty numeric not null default 10000;

-- Одна-единственная строка с текущими ценами.
insert into public.pricing_config (id)
values (1)
on conflict (id) do nothing;

alter table public.pricing_config enable row level security;

-- Старое имя политики (только для authenticated) — если таблица уже была
-- создана по прежней версии этого файла, сносим её и ставим новую, ниже.
drop policy if exists "pricing_config_select_authenticated" on public.pricing_config;
drop policy if exists "pricing_config_select_public" on public.pricing_config;
create policy "pricing_config_select_public"
    on public.pricing_config
    for select
    to anon, authenticated
    using (true);

drop policy if exists "pricing_config_update_admin_only" on public.pricing_config;
create policy "pricing_config_update_admin_only"
    on public.pricing_config
    for update
    to authenticated
    using (lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'telegram_username', '')) = 'nellmet')
    with check (lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'telegram_username', '')) = 'nellmet');
