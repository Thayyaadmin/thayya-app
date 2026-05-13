-- Thayya: public profile image URL (stored in Cloudflare R2). Run after profiles.sql.
-- Idempotent — safe to re-run.

alter table public.profiles add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'HTTPS URL of the user profile image (R2 or other CDN). Null when unset.';
