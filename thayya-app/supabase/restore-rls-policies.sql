-- Disaster recovery: recreate Row Level Security policies from this repo.
-- Run in Supabase Dashboard → SQL Editor (or `supabase db execute` against the project).
-- Idempotent — safe to re-run.
--
-- Covers: public.profiles, public.workshops, public.workshop_registrations,
--         public.workshop_reviews, public.categories, public.profile_categories
-- (workshop_registrations / workshop_reviews have RLS ON and zero policies by design — edge functions use service role.)
--
-- If you had custom policies on other tables, restore those separately.

-- =============================================================================
-- public.profiles
-- =============================================================================

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_select_public_instructors" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_own_member_instructor" on public.profiles;
drop policy if exists "profiles_update_own_admin" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_select_public_instructors"
  on public.profiles for select
  to anon
  using (user_type in ('instructor', 'admin'));

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

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (
    id = auth.uid()
    and user_type in ('member', 'instructor')
  );

-- =============================================================================
-- public.workshops
-- =============================================================================

alter table public.workshops enable row level security;

drop policy if exists "workshops_select_authenticated" on public.workshops;
drop policy if exists "workshops_insert_authenticated" on public.workshops;
drop policy if exists "workshops_update_authenticated" on public.workshops;
drop policy if exists "workshops_delete_authenticated" on public.workshops;
drop policy if exists "workshops_select_anon" on public.workshops;
drop policy if exists "workshops_insert_own_instructor" on public.workshops;
drop policy if exists "workshops_update_own_instructor" on public.workshops;
drop policy if exists "workshops_delete_own_instructor" on public.workshops;

create policy "workshops_select_authenticated"
  on public.workshops for select
  to authenticated
  using (true);

create policy "workshops_insert_own_instructor"
  on public.workshops for insert
  to authenticated
  with check (
    instructor_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and user_type in ('instructor', 'admin')
    )
  );

create policy "workshops_update_own_instructor"
  on public.workshops for update
  to authenticated
  using (
    instructor_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and user_type in ('instructor', 'admin')
    )
  )
  with check (
    instructor_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and user_type in ('instructor', 'admin')
    )
  );

create policy "workshops_delete_own_instructor"
  on public.workshops for delete
  to authenticated
  using (
    instructor_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and user_type in ('instructor', 'admin')
    )
  );

-- =============================================================================
-- public.workshop_registrations — RLS on, no policies (deny direct client DML)
-- =============================================================================

alter table public.workshop_registrations enable row level security;

-- =============================================================================
-- public.workshop_reviews — RLS on, no policies (Edge Functions use service role)
-- =============================================================================

alter table public.workshop_reviews enable row level security;

-- =============================================================================
-- public.categories — RLS on, no policies (Edge Functions use service role)
-- =============================================================================

alter table public.categories enable row level security;

drop policy if exists "categories_select_active" on public.categories;

-- =============================================================================
-- public.profile_categories — RLS on, no policies
-- =============================================================================

alter table public.profile_categories enable row level security;

drop policy if exists "profile_categories_select_public_instructors" on public.profile_categories;
drop policy if exists "profile_categories_insert_own_instructor" on public.profile_categories;
drop policy if exists "profile_categories_delete_own_instructor" on public.profile_categories;
