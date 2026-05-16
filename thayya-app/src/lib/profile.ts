import type { SupabaseClient, User } from "@supabase/supabase-js";

export type UserType = "member" | "instructor" | "admin";

export interface Profile {
  id: string;
  user_type: UserType;
  full_name: string;
  bio: string | null;
  slug: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

const PROFILE_COLUMNS =
  "id, user_type, full_name, bio, slug, avatar_url, created_at, updated_at";

/**
 * Convert a display name to a URL-safe slug. Mirrors the regex used by
 * `handle_new_user()` in `supabase/profiles-slug.sql` so app and DB stay
 * in sync. Does NOT handle collisions — that's the DB's job at insert.
 */
export function slugifyName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Load a profile row by user id. Returns null when the row does not exist yet
 * (e.g. the trigger has not fired, or the user was deleted).
 */
export async function getProfileById(
  client: SupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return (data as Profile | null) ?? null;
}

/** Look up a profile by its URL slug. Returns null if not found. */
export async function getProfileBySlug(
  client: SupabaseClient,
  slug: string,
): Promise<Profile | null> {
  if (!slug) return null;

  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return (data as Profile | null) ?? null;
}

/** Convenience: load the currently signed-in user's profile. */
export async function getCurrentProfile(
  client: SupabaseClient,
): Promise<{ user: User | null; profile: Profile | null }> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError) throw userError;
  if (!user) return { user: null, profile: null };

  const profile = await getProfileById(client, user.id);
  return { user, profile };
}

export interface ProfileUpdateInput {
  full_name?: string;
  bio?: string | null;
}

/**
 * Update the current user's profile. RLS enforces that only the user can edit
 * their own row, and that they cannot promote themselves to admin.
 */
export async function updateCurrentProfile(
  client: SupabaseClient,
  patch: ProfileUpdateInput,
): Promise<Profile> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("Not signed in.");

  const payload: Record<string, unknown> = {};
  if (typeof patch.full_name === "string") {
    const trimmed = patch.full_name.trim();
    if (!trimmed) throw new Error("Full name cannot be empty.");
    payload.full_name = trimmed;
  }
  if (patch.bio !== undefined) {
    if (patch.bio === null) {
      payload.bio = null;
    } else {
      const trimmed = patch.bio.trim();
      payload.bio = trimmed.length === 0 ? null : trimmed;
    }
  }
  if (Object.keys(payload).length === 0) {
    const existing = await getProfileById(client, user.id);
    if (!existing) throw new Error("Profile not found.");
    return existing;
  }

  const { data, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Profile;
}
