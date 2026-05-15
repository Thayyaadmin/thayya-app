import { getSupabaseEnv } from "@/lib/supabase-env";
import { isWorkshopSlug } from "@/lib/workshop-path";

export type PublicWorkshop = {
  id: string;
  slug: string | null;
  title: string | null;
  date: string | null;
  price: number | string | null;
  slots: number;
  tags: string[];
  spots_taken: number;
  spots_remaining: number;
  is_full: boolean;
  is_past: boolean;
  instructor_id: string;
  instructor_name: string | null;
  location: unknown;
  venue_name: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicWorkshopInstructor = {
  id: string;
  full_name: string | null;
  slug: string | null;
  avatar_url: string | null;
  bio: string | null;
};

/** Present when the request includes a signed-in user JWT (not the anon key). */
export type PublicWorkshopViewer = {
  is_registered: boolean;
};

export type PublicWorkshopPayload = {
  workshop: PublicWorkshop;
  instructor: PublicWorkshopInstructor | null;
  viewer: PublicWorkshopViewer | null;
};

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isWorkshopId(value: string): boolean {
  return uuidRe.test(value.trim());
}

export type FetchPublicWorkshopOptions = {
  /** Signed-in user access token — returns `viewer.is_registered` when set. */
  accessToken?: string | null;
};

async function fetchWorkshopPublic(
  param: "slug" | "id",
  value: string,
  options: FetchPublicWorkshopOptions = {},
): Promise<{ data: PublicWorkshopPayload | null; error: string | null }> {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const params = new URLSearchParams();
    params.set(param, value.trim());
    const endpoint = `${supabaseUrl}/functions/v1/workshop-public?${params.toString()}`;

    const token = options.accessToken?.trim();
    const authBearer = token ? token : supabaseAnonKey;

    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${authBearer}`,
      },
      ...(token ? { cache: "no-store" as RequestCache } : { next: { revalidate: 60 } }),
    });

    const payload = (await res.json()) as {
      workshop?: PublicWorkshop;
      instructor?: PublicWorkshopInstructor | null;
      viewer?: PublicWorkshopViewer | null;
      error?: string;
    };

    if (res.status === 404) {
      return { data: null, error: null };
    }

    if (!res.ok) {
      return {
        data: null,
        error: payload.error || res.statusText || "Unable to load workshop.",
      };
    }

    if (!payload.workshop) {
      return { data: null, error: "Invalid response from workshop-public." };
    }

    return {
      data: {
        workshop: payload.workshop,
        instructor: payload.instructor ?? null,
        viewer: payload.viewer ?? null,
      },
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to load workshop.";
    return { data: null, error: message };
  }
}

/**
 * Load by URL slug (`/workshops/<slug>`).
 */
export async function fetchPublicWorkshopBySlug(
  slug: string,
  options: FetchPublicWorkshopOptions = {},
): Promise<{ data: PublicWorkshopPayload | null; error: string | null }> {
  const normalized = slug.trim().toLowerCase();
  if (!isWorkshopSlug(normalized)) {
    return { data: null, error: null };
  }
  return fetchWorkshopPublic("slug", normalized, options);
}

/**
 * Load by uuid (legacy links / redirects).
 */
export async function fetchPublicWorkshopById(
  id: string,
  options: FetchPublicWorkshopOptions = {},
): Promise<{ data: PublicWorkshopPayload | null; error: string | null }> {
  const workshopId = id.trim();
  if (!isWorkshopId(workshopId)) {
    return { data: null, error: null };
  }
  return fetchWorkshopPublic("id", workshopId, options);
}

/**
 * Resolve either a slug or uuid from the dynamic route segment.
 */
export async function fetchPublicWorkshopByKey(
  key: string,
  options: FetchPublicWorkshopOptions = {},
): Promise<{ data: PublicWorkshopPayload | null; error: string | null }> {
  const k = key.trim();
  if (isWorkshopId(k)) {
    return fetchPublicWorkshopById(k, options);
  }
  return fetchPublicWorkshopBySlug(k, options);
}
