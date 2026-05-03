-- Thayya: workshops table RLS (run in Supabase SQL editor or via migrations).
-- Adjust policies to match your product model (e.g. per-instructor ownership with instructor_id uuid).

alter table public.workshops enable row level security;

-- Example: any signed-in user can manage workshops (suitable for a single-tenant instructor MVP).
-- Tighten later with: using (instructor_id = auth.uid()) and add instructor_id column + backfill.

drop policy if exists "workshops_select_authenticated" on public.workshops;
drop policy if exists "workshops_insert_authenticated" on public.workshops;
drop policy if exists "workshops_update_authenticated" on public.workshops;
drop policy if exists "workshops_delete_authenticated" on public.workshops;

create policy "workshops_select_authenticated"
  on public.workshops for select
  to authenticated
  using (true);

create policy "workshops_insert_authenticated"
  on public.workshops for insert
  to authenticated
  with check (true);

create policy "workshops_update_authenticated"
  on public.workshops for update
  to authenticated
  using (true)
  with check (true);

create policy "workshops_delete_authenticated"
  on public.workshops for delete
  to authenticated
  using (true);

-- Optional: allow anonymous read for the public marketing site (remove if you only want auth reads).
-- drop policy if exists "workshops_select_anon" on public.workshops;
-- create policy "workshops_select_anon" on public.workshops for select to anon using (true);
