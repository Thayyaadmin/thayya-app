-- Thayya: `updated_at` on public.workshops (save-workshop and clients select it).
-- Run AFTER public.workshops exists (e.g. after workshops-instructor-id.sql or your base workshops DDL).
-- Idempotent — safe to re-run.
--
-- Uses the same trigger helper as profiles (`profiles.sql`). Defined here too so this file is safe
-- if workshops migrations run before profiles.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.workshops add column if not exists updated_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workshops'
      and column_name = 'created_at'
  ) then
    update public.workshops
    set updated_at = coalesce(created_at, now())
    where updated_at is null;
  else
    update public.workshops set updated_at = now() where updated_at is null;
  end if;
end;
$$;

alter table public.workshops alter column updated_at set default now();
alter table public.workshops alter column updated_at set not null;

comment on column public.workshops.updated_at is
  'Set on row update via trigger; mirrors profiles.updated_at pattern.';

drop trigger if exists workshops_set_updated_at on public.workshops;
create trigger workshops_set_updated_at
  before update on public.workshops
  for each row execute function public.set_updated_at();
