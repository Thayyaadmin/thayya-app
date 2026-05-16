import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "./require-authenticated-user.ts";
import { parseGeoPoint, pointToEwkt } from "./geo-point.ts";

export const profileSelect =
  "id, user_type, full_name, bio, slug, avatar_url, primary_location, address_line, city, state, country, created_at, updated_at";

export type InstructorProfileBody = {
  full_name?: string;
  bio?: string | null;
  primary_location?: unknown;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  category_ids?: string[] | null;
};

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return uuidRe.test(s.trim());
}

function optionalTrimmedText(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export function instructorProfilePatch(
  body: InstructorProfileBody,
  fullName: string,
): { patch: Record<string, unknown>; error: string | null } {
  const geo = parseGeoPoint(body.primary_location ?? null);
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";

  if (!geo) {
    return {
      patch: {},
      error:
        'Instructors must provide primary_location as GeoJSON Point { type: "Point", coordinates: [lng, lat] }',
    };
  }
  if (!city || !country) {
    return {
      patch: {},
      error: "Instructors must provide city and country from the address",
    };
  }

  const patch: Record<string, unknown> = {
    user_type: "instructor",
    full_name: fullName,
    primary_location: pointToEwkt(geo),
    address_line: optionalTrimmedText(body.address_line),
    city,
    state: optionalTrimmedText(body.state),
    country,
  };

  if (body.bio !== undefined) {
    patch.bio = optionalTrimmedText(body.bio);
  }

  return { patch, error: null };
}

export function pointToGeoJson(value: unknown): { type: "Point"; coordinates: [number, number] } | null {
  if (value == null) return null;
  if (typeof value === "object" && value !== null) {
    const o = value as { type?: string; coordinates?: unknown[] };
    if (o.type === "Point" && Array.isArray(o.coordinates) && o.coordinates.length >= 2) {
      const lng = Number(o.coordinates[0]);
      const lat = Number(o.coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { type: "Point", coordinates: [lng, lat] };
      }
    }
  }
  if (typeof value === "string") {
    const m = /^SRID=\d+;POINT\(([-.0-9eE+]+)\s+([-.0-9eE+]+)\)$/i.exec(value.trim());
    if (m) {
      const lng = Number(m[1]);
      const lat = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { type: "Point", coordinates: [lng, lat] };
      }
    }
  }
  return null;
}

export async function syncCategoryIds(
  admin: SupabaseClient,
  profileId: string,
  categoryIds: string[],
  logTag: string,
): Promise<Response | null> {
  if (categoryIds.length === 0) {
    const { error: delErr } = await admin
      .from("profile_categories")
      .delete()
      .eq("profile_id", profileId);
    if (delErr) {
      console.error(`[${logTag}] clear categories`, delErr.message);
      return Response.json({ error: delErr.message }, { status: 400, headers: corsHeaders });
    }
    return null;
  }

  const unique = [...new Set(categoryIds.map((id) => id.trim()))];
  for (const id of unique) {
    if (!isUuid(id)) {
      return Response.json(
        { error: `Invalid category id: ${id}` },
        { status: 400, headers: corsHeaders },
      );
    }
  }

  const { data: rows, error: catErr } = await admin
    .from("categories")
    .select("id")
    .in("id", unique)
    .eq("is_active", true);

  if (catErr) {
    console.error(`[${logTag}] load categories`, catErr.message);
    return Response.json({ error: catErr.message }, { status: 500, headers: corsHeaders });
  }

  const found = new Set((rows ?? []).map((r) => r.id as string));
  const missing = unique.filter((id) => !found.has(id));
  if (missing.length > 0) {
    return Response.json(
      { error: `Unknown or inactive category id(s): ${missing.join(", ")}` },
      { status: 400, headers: corsHeaders },
    );
  }

  const { error: delErr } = await admin
    .from("profile_categories")
    .delete()
    .eq("profile_id", profileId);

  if (delErr) {
    console.error(`[${logTag}] replace categories delete`, delErr.message);
    return Response.json({ error: delErr.message }, { status: 400, headers: corsHeaders });
  }

  const { error: insErr } = await admin.from("profile_categories").insert(
    unique.map((category_id) => ({ profile_id: profileId, category_id })),
  );

  if (insErr) {
    console.error(`[${logTag}] replace categories insert`, insErr.message);
    return Response.json({ error: insErr.message }, { status: 400, headers: corsHeaders });
  }

  return null;
}

export async function loadCategoryIdsForProfile(
  admin: SupabaseClient,
  profileId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from("profile_categories")
    .select("category_id")
    .eq("profile_id", profileId);

  if (error) throw error;
  return (data ?? []).map((r) => r.category_id as string);
}

export async function loadCategoryLabelsForProfiles(
  admin: SupabaseClient,
  profileIds: string[],
): Promise<Map<string, { id: string; slug: string; label: string }[]>> {
  const map = new Map<string, { id: string; slug: string; label: string }[]>();
  if (profileIds.length === 0) return map;

  const { data, error } = await admin
    .from("profile_categories")
    .select("profile_id, categories(id, slug, label)")
    .in("profile_id", profileIds);

  if (error) throw error;

  for (const row of data ?? []) {
    const pid = row.profile_id as string;
    const cat = row.categories as { id: string; slug: string; label: string } | null;
    if (!cat) continue;
    const list = map.get(pid) ?? [];
    list.push(cat);
    map.set(pid, list);
  }
  return map;
}
