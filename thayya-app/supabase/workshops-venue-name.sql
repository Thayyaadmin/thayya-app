-- Thayya: add `venue_name` to public.workshops.
-- Optional human-readable venue label (e.g. "Aga Khan Hall", "Studio 5") that
-- pairs with the existing address_line / city / state / country columns.
-- Run AFTER workshops-location-slots.sql. Idempotent — safe to re-run.

alter table public.workshops add column if not exists venue_name text;

comment on column public.workshops.venue_name is
  'Human-readable venue label (e.g. "Studio 5", "Aga Khan Hall"). Optional. Sits alongside address_line / city / state / country.';
