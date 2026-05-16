-- Thayya: self check-in on workshop registrations.
-- Run AFTER workshop-registrations.sql.
-- Idempotent.
--
-- `attended_at` set when the registered member checks in (mark-workshop-attendance).

alter table public.workshop_registrations
  add column if not exists attended_at timestamptz;

alter table public.workshop_registrations
  add column if not exists attended_by uuid references public.profiles(id) on delete set null;

comment on column public.workshop_registrations.attended_at is
  'When the member was marked present for this workshop; null if not yet marked or marked absent.';

comment on column public.workshop_registrations.attended_by is
  'Profile id of the member who checked in (same as user_id when self check-in).';

create index if not exists workshop_registrations_workshop_attended_idx
  on public.workshop_registrations (workshop_id)
  where attended_at is not null;
