-- Thayya: migrate public.workshops.id from bigint to uuid.
-- Run AFTER profiles.sql and BEFORE workshop-registrations.sql.
-- Idempotent: safe to re-run; no-ops once the column is already uuid.
--
-- ⚠️ Destructive intent: existing bigint IDs are NOT preserved — every row
-- gets a brand-new uuid. This is acceptable only because the workshops table
-- currently has no production data with external references (deeplinks,
-- emails, shared URLs, etc.). If that ever changes, switch to the dual-column
-- pattern (keep `legacy_bigint_id` for lookup) before running this.
--
-- Why uuid:
--   * Matches the rest of the schema (profiles.id, auth.users.id, instructor_id).
--   * Removes ID enumeration via /workshops/1, /workshops/2, …
--   * Eliminates JS-number precision risks for ids > 2^53.
--   * Makes the existing isUuid() validator in save-workshop correct.

do $$
declare
  current_type text;
begin
  select data_type
    into current_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'workshops'
    and column_name = 'id';

  if current_type is null then
    raise exception 'public.workshops table or id column not found';
  end if;

  if current_type = 'uuid' then
    raise notice 'public.workshops.id is already uuid — nothing to do.';
    return;
  end if;

  if current_type <> 'bigint' then
    raise exception
      'Unexpected current type for public.workshops.id: %. Aborting to avoid data loss.',
      current_type;
  end if;

  -- 1. New uuid column, backfilled for every existing row.
  alter table public.workshops add column id_new uuid default gen_random_uuid();
  update public.workshops set id_new = gen_random_uuid() where id_new is null;
  alter table public.workshops alter column id_new set not null;

  -- 2. Drop the old PK + bigint column. No FKs currently target workshops.id;
  --    if/when other tables are added before this runs, add their fixup here.
  alter table public.workshops drop constraint workshops_pkey;
  alter table public.workshops drop column id;

  -- 3. Promote the new column to be the primary key, with uuid default.
  alter table public.workshops rename column id_new to id;
  alter table public.workshops add primary key (id);
  alter table public.workshops alter column id set default gen_random_uuid();
end;
$$;
