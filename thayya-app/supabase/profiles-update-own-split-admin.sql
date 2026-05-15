-- Fix: admins could not UPDATE their own row (WITH CHECK required user_type in
-- ('member','instructor')), which broke avatar uploads and surfaced as PostgREST
-- "Cannot coerce the result to a single JSON object" when using .single() on 0 rows.
-- Run in SQL editor after profiles.sql. Idempotent.

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_own_member_instructor" on public.profiles;
drop policy if exists "profiles_update_own_admin" on public.profiles;

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
