import { getSupabaseEnv } from "@/lib/supabase-env";

/**
 * Dashboard: GET **instructor-workshops-upcoming** — the signed-in instructor’s upcoming (or undated) workshops only.
 */
export async function fetchInstructorWorkshopsUpcoming(
  accessToken: string,
): Promise<{ workshops: Record<string, unknown>[]; error: string | null }> {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const endpoint = `${supabaseUrl}/functions/v1/instructor-workshops-upcoming`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const payload = (await res.json()) as {
      workshops?: Record<string, unknown>[];
      error?: string;
    };
    if (!res.ok) {
      return {
        workshops: [],
        error: payload.error || res.statusText || "Unable to load workshops.",
      };
    }
    const list = payload.workshops;
    return { workshops: Array.isArray(list) ? list : [], error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to load workshops.";
    return { workshops: [], error: message };
  }
}
