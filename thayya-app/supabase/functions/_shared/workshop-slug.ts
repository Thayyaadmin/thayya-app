import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Mirrors profiles-slug.sql / profile.ts slugifyName. */
export function slugifyWorkshopTitle(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "workshop";
}

/** Allocate a unique slug from `title`, optionally excluding one workshop id (updates). */
export async function allocateWorkshopSlug(
  admin: SupabaseClient,
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugifyWorkshopTitle(title);
  let candidate = base;
  let counter = 2;

  for (;;) {
    let query = admin.from("workshops").select("id").eq("slug", candidate);
    if (excludeId) {
      query = query.neq("id", excludeId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}
