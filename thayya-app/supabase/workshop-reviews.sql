-- Thayya: post-workshop ratings from attendees (1–5 stars).
-- Run AFTER workshop-registrations.sql (needs workshops + profiles).
-- Idempotent.
--
-- One review per (user, workshop). Instructor aggregate ratings are computed
-- from `instructor_id` (denormalized from workshops.instructor_id at submit time).

-- ============================================================================
-- 1. Table
-- ============================================================================

create table if not exists public.workshop_reviews (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, user_id)
);

comment on table public.workshop_reviews is
  'Member ratings for workshops they attended. One row per (user, workshop). Business rules enforced in edge functions.';

create index if not exists workshop_reviews_workshop_id_idx
  on public.workshop_reviews (workshop_id);

create index if not exists workshop_reviews_user_id_idx
  on public.workshop_reviews (user_id);

create index if not exists workshop_reviews_instructor_id_idx
  on public.workshop_reviews (instructor_id);

-- ============================================================================
-- 2. Row Level Security
--    All access flows through edge functions with the service role.
-- ============================================================================

alter table public.workshop_reviews enable row level security;
