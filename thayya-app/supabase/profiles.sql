-- Thayya: profiles table backing auth.users with user_type, full_name, and optional bio.
-- Run in Supabase SQL editor (or via migrations) AFTER auth.users exists (it always does on a fresh project).

-- ============================================================================
-- 1. Table
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_type text not null check (user_type in ('member', 'instructor', 'admin')),
  full_name text not null check (char_length(trim(full_name)) > 0),
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth.users user. user_type drives portal routing (member/instructor/admin). full_name is required; bio is an optional short introduction.';

create index if not exists profiles_user_type_idx on public.profiles (user_type);

-- ============================================================================
-- 2. updated_at trigger
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 3. Auto-create profile when an auth.users row is inserted.
--    Reads from raw_user_meta_data which signUp({ options: { data: ... } }) populates.
--    Defaults user_type to 'member' and full_name to the email local-part so existing
--    rows (without the new metadata) still satisfy NOT NULL constraints.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  resolved_user_type text;
  resolved_full_name text;
  resolved_bio text;
begin
  resolved_user_type := nullif(trim(meta->>'user_type'), '');
  if resolved_user_type is null or resolved_user_type not in ('member', 'instructor', 'admin') then
    resolved_user_type := 'member';
  end if;

  resolved_full_name := nullif(trim(meta->>'full_name'), '');
  if resolved_full_name is null then
    resolved_full_name := split_part(coalesce(new.email, ''), '@', 1);
  end if;
  if resolved_full_name is null or resolved_full_name = '' then
    resolved_full_name := 'Thayya user';
  end if;

  resolved_bio := nullif(trim(meta->>'bio'), '');

  insert into public.profiles (id, user_type, full_name, bio)
  values (new.id, resolved_user_type, resolved_full_name, resolved_bio)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_own_member_instructor" on public.profiles;
drop policy if exists "profiles_update_own_admin" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

-- Any signed-in user can read profiles (instructor pages, attendee lists, etc.).
-- Tighten later if you need stricter visibility.
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- Own-row updates: two policies (OR) so admins can change fields like avatar_url
-- without opening self-promotion to admin (member/instructor rows cannot set user_type to admin).
create policy "profiles_update_own_member_instructor"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and user_type in ('member', 'instructor'))
  with check (id = auth.uid() and user_type in ('member', 'instructor'));

create policy "profiles_update_own_admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and user_type = 'admin')
  with check (id = auth.uid() and user_type = 'admin');

-- Inserts normally happen through the trigger (security definer), but allow self-insert
-- as a fallback so a missing row can be created from the client without bypass keys.
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (
    id = auth.uid()
    and user_type in ('member', 'instructor')
  );

-- ============================================================================
-- 5. Backfill profiles for users that existed before this migration.
-- ============================================================================

insert into public.profiles (id, user_type, full_name, bio)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data->>'user_type'), ''), 'member') as user_type,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Thayya user'
  ) as full_name,
  nullif(trim(u.raw_user_meta_data->>'bio'), '') as bio
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
