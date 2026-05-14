-- Thayya: allow signed-out visitors to read instructor/admin profiles.
-- Run AFTER profiles.sql.
--
-- Without this, /instructors/[slug] always 404s for anon: RLS had only
-- "profiles_select_authenticated", so getProfileBySlug() returned no row.

drop policy if exists "profiles_select_public_instructors" on public.profiles;

create policy "profiles_select_public_instructors"
  on public.profiles for select
  to anon
  using (user_type in ('instructor', 'admin'));
