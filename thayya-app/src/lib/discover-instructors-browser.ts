import { getSupabaseEnv } from "@/lib/supabase-env";
import type { DiscoverInstructorRow } from "@/lib/discover-data";

/**
 * Browser `fetch` to **discover-instructors** Edge Function (no Next.js `fetch` cache).
 */
export async function fetchDiscoverInstructorsBrowser(
  lat: number,
  lng: number,
): Promise<{ data: DiscoverInstructorRow[]; error: string | null }> {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
    const endpoint = `${supabaseUrl}/functions/v1/discover-instructors?${params.toString()}`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
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
    return { data: Array.isArray(list) ? list : [], error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to fetch instructors.";
    return { data: [], error: message };
  }
}
