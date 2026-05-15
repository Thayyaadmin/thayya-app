-- Thayya: free-form tags on workshops (multiple per workshop).
-- Run AFTER public.workshops exists. Idempotent.

alter table public.workshops add column if not exists tags text[] not null default '{}';

comment on column public.workshops.tags is
  'Labels set by the instructor (e.g. bollywood, beginner). Replaced in full on save-workshop update.';

create index if not exists workshops_tags_gin_idx
  on public.workshops using gin (tags);
