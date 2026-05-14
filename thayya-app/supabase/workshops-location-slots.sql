-- Thayya: workshop venue pin, structured address text, and capacity slots.
-- Run AFTER profiles-location.sql (PostGIS) and any migration that creates public.workshops. Idempotent.

alter table public.workshops add column if not exists location geography(Point, 4326);

comment on column public.workshops.location is
  'Venue map pin (WGS-84). GeoJSON Point from the API: coordinates are [longitude, latitude].';

alter table public.workshops add column if not exists address_line text;
alter table public.workshops add column if not exists city text;
alter table public.workshops add column if not exists state text;
alter table public.workshops add column if not exists country text;

comment on column public.workshops.address_line is 'Street, venue, or neighbourhood line.';
comment on column public.workshops.city is 'City or town.';
comment on column public.workshops.state is 'State or region.';
comment on column public.workshops.country is 'Country.';

alter table public.workshops add column if not exists slots integer;

comment on column public.workshops.slots is 'Maximum participant slots (capacity) for this workshop.';

update public.workshops
set slots = 20
where slots is null or slots < 1;

alter table public.workshops alter column slots set default 20;
alter table public.workshops alter column slots set not null;

alter table public.workshops drop constraint if exists workshops_slots_positive_chk;
alter table public.workshops add constraint workshops_slots_positive_chk check (slots > 0);

create index if not exists workshops_location_gix
  on public.workshops using gist (location)
  where location is not null;
