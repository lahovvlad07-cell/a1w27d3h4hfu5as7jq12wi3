-- ===== ТАБЛИЦА ЦЕН, РЕДАКТИРУЕМАЯ ИЗ АДМИНКИ =====
-- Выполни этот файл целиком в Supabase → SQL Editor → New query → Run.
-- Ничего дополнительно деплоить не нужно — это обычная таблица с
-- Row Level Security, никакой Edge Function для админки не требуется.
--
-- Как это работает:
--   - Читать цены может любой вошедший пользователь (нужно для каталога).
--   - Менять цены может только тот, кто вошёл Telegram-аккаунтом @nellmet
--     (сверяется по telegram_username в его профиле — см. telegram-link).
--   - Если поменять юзернейм администратора, поменяй 'nellmet' в двух
--     местах ниже (в обеих политиках) и выполни файл заново.

create table if not exists public.pricing_config (
    id int primary key default 1,
    steam_fee_percent numeric not null default 6,
    steam_min_amount numeric not null default 100,
    stars_price_per_unit numeric not null default 1.49,
    stars_min_qty numeric not null default 50,
    updated_at timestamptz not null default now(),
    constraint pricing_config_singleton check (id = 1)
);

-- Одна-единственная строка с текущими ценами.
insert into public.pricing_config (id)
values (1)
on conflict (id) do nothing;

alter table public.pricing_config enable row level security;

drop policy if exists "pricing_config_select_authenticated" on public.pricing_config;
create policy "pricing_config_select_authenticated"
    on public.pricing_config
    for select
    to authenticated
    using (true);

drop policy if exists "pricing_config_update_admin_only" on public.pricing_config;
create policy "pricing_config_update_admin_only"
    on public.pricing_config
    for update
    to authenticated
    using (lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'telegram_username', '')) = 'nellmet')
    with check (lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'telegram_username', '')) = 'nellmet');
