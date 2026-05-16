-- Thayya: instructor expertise categories (controlled catalog + profile assignments).
-- Run AFTER public.profiles exists. Idempotent.
--
-- Tables:
--   public.categories         — master list (Bollywood, HIIT, …)
--   public.profile_categories — many-to-many: which instructor teaches which categories
--
-- Workshop tags (free-form per class) stay on public.workshops.tags — separate concern.

-- ============================================================================
-- 1. categories (lookup)
-- ============================================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 1 and 64
  ),
  constraint categories_label_nonempty check (char_length(trim(label)) > 0),
  constraint categories_slug_unique unique (slug)
);

comment on table public.categories is
  'Controlled dance/fitness taxonomy. Instructors pick from this list; labels display on home and instructor pages.';

comment on column public.categories.slug is
  'Stable URL-safe key (e.g. bollywood). Used in filters and APIs.';

comment on column public.categories.label is
  'Human-readable name shown in the UI (e.g. Bollywood).';

comment on column public.categories.is_active is
  'When false, hidden from instructor pickers; existing profile_categories rows may remain until cleaned up.';

create index if not exists categories_is_active_sort_idx
  on public.categories (is_active, sort_order, label);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 2. profile_categories (instructor ↔ category)
-- ============================================================================

create table if not exists public.profile_categories (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (profile_id, category_id)
);

comment on table public.profile_categories is
  'Instructor expertise: one row per (profile, category). Only instructor/admin profiles should have rows.';

create index if not exists profile_categories_category_id_idx
  on public.profile_categories (category_id);

create index if not exists profile_categories_profile_id_idx
  on public.profile_categories (profile_id);

-- ============================================================================
-- 3. Seed catalog (idempotent)
-- ============================================================================

insert into public.categories (slug, label, sort_order, is_active)
values
  ('rnt', 'RNT', 10, true),
  ('bollywood', 'Bollywood', 20, true),
  ('cardio', 'Cardio', 30, true),
  ('classical', 'Classical', 40, true),
  ('hiit', 'HIIT', 50, true),
  ('fusion', 'Fusion', 60, true)
on conflict (slug) do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

-- ============================================================================
-- 4. Row Level Security — ON, no policies (deny direct client access)
-- ============================================================================
-- Same pattern as workshop_registrations: business rules live in Edge Functions
-- (admin-create-instructor, categories-active, instructor-public, …).

alter table public.categories enable row level security;
alter table public.profile_categories enable row level security;

drop policy if exists "categories_select_active" on public.categories;
drop policy if exists "profile_categories_select_public_instructors" on public.profile_categories;
drop policy if exists "profile_categories_insert_own_instructor" on public.profile_categories;
drop policy if exists "profile_categories_delete_own_instructor" on public.profile_categories;
