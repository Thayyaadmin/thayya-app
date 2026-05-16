-- Thayya: cached instructor ratings on profiles.
-- Run AFTER workshop-reviews.sql.
-- Idempotent.
--
-- `rating_avg` / `rating_count` are updated incrementally in the
-- submit-workshop-review edge function when a member rates a class.

-- ============================================================================
-- 1. Columns on profiles
-- ============================================================================

alter table public.profiles
  add column if not exists rating_avg numeric(3, 1);

alter table public.profiles
  add column if not exists rating_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_rating_count_non_negative'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_rating_count_non_negative
      check (rating_count >= 0);
  end if;
end $$;

comment on column public.profiles.rating_avg is
  'Cached average of workshop_reviews.rating (1 decimal). Null when rating_count is 0.';

comment on column public.profiles.rating_count is
  'Cached count of workshop_reviews for this instructor profile.';

-- ============================================================================
-- 2. Remove legacy sync trigger/function (if a prior migration added them)
-- ============================================================================

drop trigger if exists workshop_reviews_sync_instructor_rating on public.workshop_reviews;
drop function if exists public.workshop_reviews_sync_instructor_rating();
drop function if exists public.refresh_instructor_rating(uuid);
