-- Signup always creates a member profile. Instructor/admin roles are set only via Edge Functions.
-- Run AFTER profiles-slug.sql. Idempotent.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  resolved_full_name text;
  resolved_bio text;
  base_slug text;
  candidate_slug text;
  slug_counter int;
begin
  resolved_full_name := nullif(trim(meta->>'full_name'), '');
  if resolved_full_name is null then
    resolved_full_name := split_part(coalesce(new.email, ''), '@', 1);
  end if;
  if resolved_full_name is null or resolved_full_name = '' then
    resolved_full_name := 'Thayya user';
  end if;

  resolved_bio := nullif(trim(meta->>'bio'), '');

  base_slug := trim(both '-' from
    regexp_replace(lower(resolved_full_name), '[^a-z0-9]+', '-', 'g')
  );
  if base_slug = '' then base_slug := 'user'; end if;
  candidate_slug := base_slug;
  slug_counter := 2;
  while exists (select 1 from public.profiles where slug = candidate_slug) loop
    candidate_slug := base_slug || '-' || slug_counter;
    slug_counter := slug_counter + 1;
  end loop;

  insert into public.profiles (id, user_type, full_name, bio, slug)
  values (new.id, 'member', resolved_full_name, resolved_bio, candidate_slug)
  on conflict (id) do nothing;

  return new;
end;
$$;
