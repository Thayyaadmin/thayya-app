-- Thayya: add SEO-friendly slug to public.profiles for instructor pages.
-- Run AFTER profiles.sql. Idempotent — safe to re-run.
--
-- URLs: /instructors/<slug>     e.g. /instructors/anaya-krishnan
-- Collision strategy: append -2, -3, … to keep slugs human-readable.

-- ============================================================================
-- 1. Column
-- ============================================================================

alter table public.profiles add column if not exists slug text;

-- ============================================================================
-- 2. Backfill rows that don't yet have a slug, with collision resolution.
--    Done in PL/pgSQL so we can loop and probe for duplicates per row.
-- ============================================================================

do $$
declare
  r record;
  base text;
  candidate text;
  counter int;
begin
  for r in
    select id, full_name from public.profiles where slug is null
  loop
    base := trim(both '-' from
      regexp_replace(lower(coalesce(r.full_name, '')), '[^a-z0-9]+', '-', 'g')
    );
    if base = '' then base := 'user'; end if;

    candidate := base;
    counter := 2;
    while exists (select 1 from public.profiles where slug = candidate) loop
      candidate := base || '-' || counter;
      counter := counter + 1;
    end loop;

    update public.profiles set slug = candidate where id = r.id;
  end loop;
end $$;

-- ============================================================================
-- 3. Uniqueness — partial unique index so it allows multiple NULLs while still
--    rejecting duplicate non-null slugs.
-- ============================================================================

create unique index if not exists profiles_slug_unique_idx
  on public.profiles (slug)
  where slug is not null;

-- ============================================================================
-- 4. Extend handle_new_user to also set slug for new signups.
--    Keeps the rest of the function identical to profiles.sql.
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
  base_slug text;
  candidate_slug text;
  slug_counter int;
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

  -- Compute slug with collision suffixing.
  base_slug := trim(both '-' from
    regexp_replace(lower(resolved_full_name), '[^a-z0-9]+', '-', 'g')
  );
  if base_slug = '' then base_slug := 'user'; end if;
  candidate_slug := base_slug;
  slug_counter := 2;
  while exists (select 1 from public.profiles where slug = candidate_slug) loop
    candidate_slug := base_slug || '-' || slug_counter;
    slug_counter := slug_counter + 1;
  end loop;

  insert into public.profiles (id, user_type, full_name, bio, slug)
  values (new.id, resolved_user_type, resolved_full_name, resolved_bio, candidate_slug)
  on conflict (id) do nothing;

  return new;
end;
$$;
