-- Thayya: workshop registrations — who has signed up for which workshop.
-- Run AFTER profiles.sql AND workshops-id-uuid.sql (workshops.id must be uuid).
-- Idempotent.
--
-- Design note: the database is intentionally minimal. No triggers, no helper
-- functions, no capacity / date / role guards. All business rules (slot
-- capacity, past-date refusal, self-registration block, cancellation, etc.)
-- live in the edge functions. The only DB-side guarantees here are:
--   * referential integrity (FKs to workshops + profiles, cascade on delete)
--   * UNIQUE (workshop_id, user_id) — one row per user per workshop for its
--     whole lifetime; cancellation toggles `status` in place
--   * CHECK on the allowed `status` values

-- ============================================================================
-- 1. Table
-- ============================================================================

create table if not exists public.workshop_registrations (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  unique (workshop_id, user_id)
);

comment on table public.workshop_registrations is
  'One row per (user, workshop) signup. `status` toggles between active and cancelled in place; we never insert a second row for the same pair. All business validation happens in the edge functions.';

comment on column public.workshop_registrations.status is
  'active = currently registered, cancelled = user opted out. Only active rows count against workshop capacity.';

create index if not exists workshop_registrations_workshop_id_idx
  on public.workshop_registrations (workshop_id);

create index if not exists workshop_registrations_user_id_idx
  on public.workshop_registrations (user_id);

-- ============================================================================
-- 2. Row Level Security
--    All access flows through edge functions with the service role (which
--    bypasses RLS). Enable RLS with no policies so the table is
--    deny-by-default for any direct anon / authenticated client call.
-- ============================================================================

alter table public.workshop_registrations enable row level security;
