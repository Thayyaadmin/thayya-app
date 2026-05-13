# Thayya — Architecture & Decision Log

A living reference for how this app is built and the decisions behind it.
Keep adding to it. Each section is intentionally small and self-contained
so it stays readable as the codebase grows.

> **How to use this doc**
> - When you change something architectural, update the relevant section
>   (or add a new one) and add a one-line entry under "Decision log".
> - When you have an open question, drop it under "Open questions" so
>   it's tracked instead of forgotten.

---

## 1. Tech stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) | Mix of `.js` and `.tsx` is intentional during the early phase. |
| Language | TypeScript (gradual) | New code is `.ts`/`.tsx`; pre-existing pages can stay `.js`. |
| Styling | Tailwind v4 + a few shadcn-style components | Design tokens live in `globals.css` (`--ink`, `--t-magenta`, etc.). |
| Auth + DB | Supabase (`@supabase/ssr`) | Session is cookie-based so middleware and server actions see auth. |
| Hosting | Vercel | `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required env vars. |

---

## 2. Project layout (what lives where)

```
thayya-app/
├── middleware.ts                       # Top-level Next middleware (delegates to supabase/middleware.ts)
├── docs/
│   └── architecture.md                 # ← you are here
├── supabase/                           # SQL migrations. Run in order in the Supabase SQL editor.
│   ├── profiles.sql
│   ├── profiles-slug.sql               # Adds slug column + backfill + extends handle_new_user
│   ├── workshops-instructor-id.sql
│   └── workshops-rls.sql               # DEPRECATED — see workshops-instructor-id.sql
├── src/
│   ├── app/
│   │   ├── page.js                     # Public landing (member/instructor/admin role-switcher prototype)
│   │   ├── login/                      # Auth entry point
│   │   ├── dashboard/                  # Signed-in instructor dashboard
│   │   ├── instructors/[slug]/         # Public per-instructor page (SSR, SEO-friendly)
│   │   └── supabaseClient.js           # Browser Supabase client (cookie session)
│   ├── components/
│   │   ├── auth-form.js                # Signup + login form
│   │   ├── dashboard/                  # Dashboard widgets
│   │   └── ui/                         # shadcn-style primitives
│   └── lib/
│       ├── supabase/
│       │   ├── server.ts               # Server-component Supabase client
│       │   └── middleware.ts           # Edge middleware: session refresh + /dashboard gate
│       ├── supabase-env.js             # Env var loading & URL normalization
│       ├── profile.ts                  # Profile types + fetch/update helpers
│       └── instructor-profile.ts       # Display-name + initials helpers (reads user_metadata)
```

---

## 3. Data model

### `auth.users` (managed by Supabase)
The canonical identity. We never write to this directly — Supabase manages it.
At signup, we attach extra fields via `signUp({ options: { data: ... } })`
which Supabase stores on `auth.users.raw_user_meta_data`.

### `public.profiles`
One row per `auth.users` user, FK `id → auth.users(id) ON DELETE CASCADE`.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | Same uuid as `auth.users.id`. |
| `user_type` | `text` CHECK in `('member','instructor','admin')` | Drives portal routing and write permissions. |
| `full_name` | `text` NOT NULL | Source of truth for display name. |
| `bio` | `text` nullable | Optional short intro shown on the public instructor page. |
| `slug` | `text` unique (where not null) | URL slug for the public instructor page, e.g. `anaya-krishnan`. See §9. |
| `created_at` | `timestamptz` | `default now()` |
| `updated_at` | `timestamptz` | Maintained by `set_updated_at()` trigger. |

Indexes: `profiles_user_type_idx (user_type)`, `profiles_slug_unique_idx (slug) where slug is not null`.

### `public.workshops`
Pre-existing table. The columns relevant to auth/ownership are:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `title` | `text` | |
| `date` | `timestamptz` | |
| `price` | `numeric` | |
| `instructor` | `text` | Legacy free-text column. Read-only fallback for display when the FK is null. |
| `instructor_id` | `uuid` → `profiles.id` ON DELETE SET NULL | **The link to the instructor.** Set on insert from `auth.uid()` and never mutated afterward. |

Indexes: `workshops_instructor_id_idx (instructor_id)`.

### Relationships at a glance

```
auth.users (1) ──┬── (1) public.profiles
                 │
                 └── (1..N) public.workshops    (via workshops.instructor_id)
```

---

## 4. Authentication & sign-up flow

```
1. User submits signup form (src/components/auth-form.js)
       │
       │   supabase.auth.signUp({
       │     email, password,
       │     options: { data: { full_name, user_type, bio, name } }
       │   })
       ▼
2. Supabase inserts into auth.users (stores meta in raw_user_meta_data)
       │
       ▼
3. Trigger `on_auth_user_created` fires
       │
       │   handle_new_user() reads raw_user_meta_data,
       │   resolves user_type / full_name / bio with safe fallbacks,
       │   and inserts a matching row into public.profiles.
       ▼
4. Profile row exists. Subsequent requests can join from workshops
   into profiles to display the instructor's name.
```

### Why a `profiles` table at all?
We could have used only `auth.users.raw_user_meta_data`, but:
- Other rows (e.g. `workshops.instructor_id`) need a real FK target.
- RLS policies on other tables need to query the user's role cheaply.
- Joins from `workshops` to the user's display name need a real table.

### Two display-name helpers
- **`src/lib/instructor-profile.ts`** — quick client-side display name from
  the `User` object's `user_metadata` (no DB round-trip). Used in the
  dashboard greeting / avatar.
- **`src/lib/profile.ts`** — full profile fetch from `public.profiles`.
  Used wherever we need the authoritative row (server actions, public
  pages, etc.).

---

## 5. Authorization (Row Level Security)

We use Supabase RLS as the **only** security boundary. The anon key is
public (it's shipped to the browser), so any restriction enforced only
in the Next.js layer is bypassable. App-side checks exist purely for UX
(friendlier error messages, redirects).

### `profiles` policies

| Policy | Action | Who | Rule |
| --- | --- | --- | --- |
| `profiles_select_authenticated` | SELECT | `authenticated` | `true` — anyone signed in can read any profile (needed for the public instructor page). |
| `profiles_update_own` | UPDATE | `authenticated` | `id = auth.uid()` and the new row's `user_type in ('member','instructor')` — **users cannot self-promote to admin**. |
| `profiles_insert_own` | INSERT | `authenticated` | Same as update — fallback for cases where the trigger didn't run. |

### `workshops` policies (after `workshops-instructor-id.sql`)

| Policy | Action | Who | Rule |
| --- | --- | --- | --- |
| `workshops_select_authenticated` | SELECT | `authenticated` | `true` |
| `workshops_insert_own_instructor` | INSERT | `authenticated` | `instructor_id = auth.uid()` AND caller's profile has `user_type in ('instructor','admin')`. |
| `workshops_update_own_instructor` | UPDATE | `authenticated` | Caller owns the row AND is an instructor/admin. `WITH CHECK` repeats the rule so ownership can't be reassigned via update. |
| `workshops_delete_own_instructor` | DELETE | `authenticated` | Same as update. |

### Where role checks live (defense in depth)

For "only instructors can create workshops":

| Layer | Where | Purpose |
| --- | --- | --- |
| Middleware | `src/lib/supabase/middleware.ts` | Just redirects unauthenticated users to `/login`. Does **not** check `user_type` (members can land on `/dashboard` but can't write). |
| Server action | `src/app/dashboard/workshops/actions.ts → saveWorkshop` | Friendly error message ("Only instructors can create workshops."). |
| DB (RLS) | `workshops_insert_own_instructor` | The actual security boundary. |

> If you change the rule, change it in both the server action and the
> RLS policy. The RLS policy is what binds; the server action is UX.

---

## 6. Operational guide (common changes)

### How to change a workshop role restriction

1. In `supabase/workshops-instructor-id.sql`, update the relevant
   `create policy` block.
2. Paste the new `drop policy if exists … create policy …` into the
   Supabase SQL editor and run. (Single transaction, no downtime.)
3. Update the matching check in
   `src/app/dashboard/workshops/actions.ts → saveWorkshop` so the
   friendly error message stays in sync.

### How to add a new user type (e.g., `'studio_owner'`)

1. Update the `CHECK` constraint on `profiles.user_type` in `profiles.sql`
   (you'll need to drop and re-create it via `ALTER TABLE`).
2. Update the `UserType` union in `src/lib/profile.ts`.
3. Update any RLS policy that hardcodes the list of allowed roles
   (currently only the three `workshops_*_own_instructor` policies).
4. Update the role-check in
   `src/app/dashboard/workshops/actions.ts` if you want studio owners
   to be able to create workshops.
5. Decide whether the new type should be selectable in the signup form
   (`USER_TYPES` array in `src/components/auth-form.js`).

### How to disable signups temporarily

Two options:
- Toggle "Allow new users to sign up" in the Supabase Auth settings (UI).
- Or hide the "Create Account" tab in `auth-form.js`.

---

## 7. Public instructor pages

Each instructor gets a dedicated, server-rendered, SEO-friendly page.

### URL shape
```
/instructors/<slug>     e.g. /instructors/anaya-krishnan
```

### Slug strategy
- `profiles.slug` is a `text` column with a partial unique index
  (`unique where slug is not null`).
- Generated from `full_name` by stripping accents, lowercasing, and
  replacing non-alphanumeric runs with `-`. Empty slugs fall back to
  `'user'`.
- Collisions are resolved by appending `-2`, `-3`, … so URLs stay
  human-readable: `anaya-krishnan`, `anaya-krishnan-2`, …
- Slug generation happens in **two places** that must stay in sync:
  - `public.handle_new_user()` trigger (in `supabase/profiles-slug.sql`)
    — for new signups.
  - `slugifyName()` in `src/lib/profile.ts` — mirror of the regex,
    used by app code that needs to compute a slug locally (e.g. for
    optimistic UI). Does **not** handle collisions — that's the DB's
    job at insert.

### Route
File: `src/app/instructors/[slug]/page.tsx`

- Server component using `createSupabaseServerClient()`.
- Returns `notFound()` (404) when no profile matches the slug, or when
  the profile's `user_type` is not `instructor`/`admin` (members have
  slugs too, but no public page).
- `generateMetadata` produces SEO-friendly `<title>` and
  `<meta description>` (uses `bio` when present, else a generic
  description).
- Fetches upcoming workshops (`date >= now() OR date IS NULL`) via
  `instructor_id = profile.id`, ordered ascending.

### Discover list
The "Instructors near you" grid on `src/app/page.js` now reads from
`profiles where user_type = 'instructor' and slug is not null`, ordered
by `created_at desc`, limited to 8. Clicks navigate to
`/instructors/<slug>` (no longer a tab switch).

### Fields the design uses but the DB doesn't have yet
The original mock referenced these — we render only what we have today
and skip the rest. Add columns to `profiles` when you want them:

- `location` (city) — e.g. "Bangalore"
- `style` / `tag` — primary dance style label
- `rating`, `review_count` — aggregated from a future `reviews` table
- `students_taught` — aggregated from a future `bookings` table

### Why a real route instead of a tab
- SEO: server-rendered HTML with per-instructor `<title>`, meta tags,
  Open Graph. A tab inside a client-rendered SPA can't have that.
- Shareable URLs: people can paste/share an instructor link.
- Easier eventually for SSG/ISR if traffic grows.

---

## 8. Decision log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-05-12 | Use a `profiles` table backed by `auth.users` rather than only `user_metadata`. | Need a real FK target for `workshops.instructor_id`, easier RLS, easier joins. |
| 2026-05-12 | `handle_new_user` trigger creates the profile row at signup time. | Atomic with auth.users; works even when email confirmation defers session. Considered moving to app-side `ensureProfile()` but the trigger costs less complexity overall. |
| 2026-05-12 | `workshops.instructor_id` is FK-to-profile, set once at create, never mutated. | Renames in `profiles.full_name` should propagate to displayed workshops; ownership shouldn't be transferable through the UI. |
| 2026-05-12 | Inlined the role check directly into workshop RLS policies instead of using a `current_user_can_manage_workshops()` helper function. | "Less DB logic to manage later." Trade-off: duplication across 3 policies if the role list ever changes. |
| 2026-05-12 | Dropped the `workshops_lock_instructor_id` trigger. | The app never sends `instructor_id` in updates; RLS `WITH CHECK` is the binding constraint. Trigger was pure defense-in-depth. |
| 2026-05-12 | Instructor pages live at `/instructors/<slug>` as a real server-rendered route (not a tab). | SEO, shareable URLs, room to grow to ISR/SSG later. |
| 2026-05-12 | Slug is generated at signup by the existing `handle_new_user` trigger; collisions resolved with `-2`, `-3` suffixes. | One source of truth for new rows. Mirror regex in `slugifyName()` for app-side use. |

---

## 9. Open questions / future work

- **Dashboard role gate.** Members can currently see `/dashboard` (writes are blocked, but the page renders). Add a `requireInstructor()` server check, probably in `src/app/dashboard/layout.tsx`.
- **"My workshops only" filter.** The dashboard table currently shows every workshop, not just the signed-in instructor's. Add `.eq('instructor_id', user.id)` once we want this.
- **Missing instructor fields.** The marketing design references `location`, `style`, `tag`, `rating`, `reviews`, `students_taught` — none of these are in `profiles` yet. The `/instructors/<slug>` page currently omits them. Add columns when we want them, and update the route + Discover card.
- **Slug rename when full_name changes.** Today slugs are set at signup and never auto-updated when `full_name` changes (URLs are stable, which is usually what you want). If we want a "claim a new handle" flow, we'll need a separate `updateSlug()` server action with collision handling.
- **Email confirmation on/off.** The signup form handles both cases. Worth deciding intentionally and documenting which mode is enabled in Supabase.
- **Profile edit UI.** `updateCurrentProfile()` exists in `src/lib/profile.ts` but there's no UI for it yet.
