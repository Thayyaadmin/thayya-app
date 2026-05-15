import { getSupabaseEnv } from "@/lib/supabase-env";

export type DiscoverWorkshopRow = {
  id: string;
  slug?: string | null;
  tags?: string[] | null;
  title: string | null;
  date: string | null;
  price: number | string | null;
  instructor: string | null;
  instructor_name?: string | null;
  instructor_profile?: {
    id: string;
    full_name: string;
    user_type: string;
  } | null;
};

export type DiscoverInstructorRow = {
  id: string;
  full_name: string;
  slug: string | null;
  bio: string | null;
  user_type: string;
  /** Public profile image URL when set (from discover-instructors API). */
  avatar_url: string | null;
};

export type FetchDiscoverInstructorsOptions = {
  /** WGS-84 latitude; if set, `lng` must also be set. Edge filters within 20 km (haversine). */
  lat?: number;
  lng?: number;
};

export type FetchDiscoverWorkshopsOptions = {
  /** WGS-84; both set → Edge returns workshops within 20 km of workshop `location` (haversine). */
  lat?: number;
  lng?: number;
};

/**
 * Loads workshops via the **discover-workshops** Edge Function (same row shape as before).
 */
export async function fetchDiscoverWorkshops(
  options: FetchDiscoverWorkshopsOptions = {},
): Promise<{ data: DiscoverWorkshopRow[]; error: string | null }> {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const params = new URLSearchParams();
    const { lat, lng } = options;
    if (
      lat !== undefined &&
      lng !== undefined &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      params.set("lat", String(lat));
      params.set("lng", String(lng));
    }
    const qs = params.toString();
    const endpoint = `${supabaseUrl}/functions/v1/discover-workshops${qs ? `?${qs}` : ""}`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      next: { revalidate: 60 },
    });

    const payload = (await res.json()) as {
      workshops?: DiscoverWorkshopRow[];
      error?: string;
    };

    if (!res.ok) {
      return {
        data: [],
        error: payload.error || res.statusText || "Unable to fetch workshops.",
      };
    }

    const list = payload.workshops;
    return {
      data: Array.isArray(list) ? list : [],
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to fetch workshops.";
    return { data: [], error: message };
  }
}

/**
 * Loads instructor cards via the **discover-instructors** Edge Function.
 * With `lat` + `lng`, the function returns instructors within **20 km** (haversine on
 * `primary_location`) who have a public slug. Without coordinates, returns featured
 * instructors (latest eight with slug).
 */
export async function fetchDiscoverInstructors(
  options: FetchDiscoverInstructorsOptions = {},
): Promise<{
  data: DiscoverInstructorRow[];
  error: string | null;
}> {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const params = new URLSearchParams();
    const { lat, lng } = options;
    if (
      lat !== undefined &&
      lng !== undefined &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
    ) {
      params.set("lat", String(lat));
      params.set("lng", String(lng));
    }
    const qs = params.toString();
    const endpoint = `${supabaseUrl}/functions/v1/discover-instructors${qs ? `?${qs}` : ""}`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      next: { revalidate: 60 },
    });

    const payload = (await res.json()) as {
      instructors?: DiscoverInstructorRow[];
      error?: string;
    };

    if (!res.ok) {
      return {
        data: [],
        error: payload.error || res.statusText || "Unable to fetch instructors.",
      };
    }

    const list = payload.instructors;
    return {
      data: Array.isArray(list) ? list : [],
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to fetch instructors.";
    return { data: [], error: message };
  }
}
