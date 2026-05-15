-- Thayya: SEO-friendly slug on public.workshops for detail pages.
-- Run AFTER workshops-id-uuid.sql (or any migration that creates public.workshops). Idempotent.
--
-- URLs: /workshops/<slug>     e.g. /workshops/aaja-nachle-intensive
-- Collision strategy: append -2, -3, … (same as profiles-slug.sql).

alter table public.workshops add column if not exists slug text;

comment on column public.workshops.slug is
  'URL segment for /workshops/<slug>. Set from title on create; stable across title edits.';

do $$
declare
  r record;
  base text;
  candidate text;
  counter int;
begin
  for r in
    select id, title from public.workshops where slug is null
  loop
    base := trim(both '-' from
      regexp_replace(lower(coalesce(r.title, '')), '[^a-z0-9]+', '-', 'g')
    );
    if base = '' then base := 'workshop'; end if;

    candidate := base;
    counter := 2;
    while exists (select 1 from public.workshops where slug = candidate) loop
      candidate := base || '-' || counter;
      counter := counter + 1;
    end loop;

    update public.workshops set slug = candidate where id = r.id;
  end loop;
end $$;

create unique index if not exists workshops_slug_unique_idx
  on public.workshops (slug)
  where slug is not null;
