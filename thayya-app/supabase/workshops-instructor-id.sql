-- Thayya: link workshops to their instructor via FK to public.profiles.
-- Run AFTER profiles.sql. Idempotent — safe to re-run.
--
-- Design note: this migration is intentionally minimal at the DB level.
-- The only ongoing DB logic is RLS. There are no helper functions or guard
-- triggers — ownership immutability is enforced by the application never
-- including instructor_id in update payloads, and by RLS WITH CHECK on UPDATE.

-- ============================================================================
-- 0. Clean up older versions of this migration (lock trigger + helper fn).
--    Policies must be dropped first because they reference the helper.
-- ============================================================================

drop policy if exists "workshops_select_authenticated" on public.workshops;
drop policy if exists "workshops_insert_authenticated" on public.workshops;
drop policy if exists "workshops_update_authenticated" on public.workshops;
drop policy if exists "workshops_delete_authenticated" on public.workshops;
drop policy if exists "workshops_select_anon" on public.workshops;
drop policy if exists "workshops_insert_own_instructor" on public.workshops;
drop policy if exists "workshops_update_own_instructor" on public.workshops;
drop policy if exists "workshops_delete_own_instructor" on public.workshops;

drop trigger if exists workshops_lock_instructor_id on public.workshops;
drop function if exists public.workshops_lock_instructor_id();
drop function if exists public.current_user_can_manage_workshops();

-- ============================================================================
-- 1. Column + index
-- ============================================================================

alter table public.workshops
  add column if not exists instructor_id uuid
    references public.profiles(id) on delete set null;

create index if not exists workshops_instructor_id_idx
  on public.workshops (instructor_id);

-- ============================================================================
-- 2. Best-effort backfill from legacy text column (`instructor`).
--    Only assigns when exactly one profile matches the name. Ambiguous
--    matches are left NULL so a human can resolve.
-- ============================================================================

with candidates as (
  select
    w.id as workshop_id,
    p.id as profile_id,
    count(*) over (partition by w.id) as match_count
  from public.workshops w
  join public.profiles p
    on lower(trim(p.full_name)) = lower(trim(coalesce(w.instructor, '')))
  where w.instructor_id is null
    and coalesce(trim(w.instructor), '') <> ''
)
update public.workshops w
set instructor_id = c.profile_id
from candidates c
where c.workshop_id = w.id
  and c.match_count = 1;

-- ============================================================================
-- 3. Row Level Security
-- ============================================================================

alter table public.workshops enable row level security;

-- Read: any signed-in user can list/view workshops.
create policy "workshops_select_authenticated"
  on public.workshops for select
  to authenticated
  using (true);

-- Insert: caller must be an instructor or admin AND must stamp themselves.
-- The role check is inlined (no helper function) to keep DB surface minimal.
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

-- Update: caller must own the row, and the row must still be owned by them
-- after the update (so instructor_id cannot be reassigned).
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

-- Delete: caller must own the row.
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

-- Optional: allow anonymous read for a future public marketing page.
-- create policy "workshops_select_anon" on public.workshops for select to anon using (true);
