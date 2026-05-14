-- Thayya: teaching pin as PostGIS geography + structured address text columns.
-- No functions or triggers — only schema. Run AFTER profiles.sql (and profiles-slug.sql). Idempotent.
--
-- PostgREST accepts GeoJSON for `geography(Point,4326)` on insert/update, e.g.
--   {"type":"Point","coordinates":[lng,lat]}

create extension if not exists postgis with schema extensions;

alter table public.profiles add column if not exists address_line text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists country text;

comment on column public.profiles.address_line is 'Street, venue, or neighbourhood line.';
comment on column public.profiles.city is 'City or town.';
comment on column public.profiles.state is 'State or region.';
comment on column public.profiles.country is 'Country.';

alter table public.profiles add column if not exists primary_location geography(Point, 4326);

comment on column public.profiles.primary_location is
  'Primary teaching pin (WGS-84). Prefer GeoJSON Point in the API; [coordinates][0] is longitude, [1] is latitude.';

create index if not exists profiles_primary_location_gix
  on public.profiles using gist (primary_location)
  where primary_location is not null;
