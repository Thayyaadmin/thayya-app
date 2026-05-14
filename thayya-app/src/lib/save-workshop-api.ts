import { getSupabaseEnv } from "@/lib/supabase-env";

export type SaveWorkshopGeoJsonPoint = {
  type: "Point";
  coordinates: [number, number];
};

export type SaveWorkshopRequestBody = {
  intent?: "create" | "update";
  id?: string | null;
  title: string;
  date?: string | null;
  price?: number | null;
  slots?: number;
  location?: SaveWorkshopGeoJsonPoint | null;
  /** Sent in the JSON body for the save-workshop API; backend may ignore until persisted. */
  venue_name?: string | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  instructor_id?: string | null;
};

export type PostSaveWorkshopEdgeResult =
  | { ok: true; workshop: Record<string, unknown> }
  | { ok: false; status: number; message: string };

/**
 * POST to the `save-workshop` Edge Function. Caller can branch on `status === 404`
 * to fall back to direct Supabase (e.g. function not deployed locally).
 */
export async function postSaveWorkshopEdge(
  accessToken: string,
  body: SaveWorkshopRequestBody,
): Promise<PostSaveWorkshopEdgeResult> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const url = `${supabaseUrl}/functions/v1/save-workshop`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 0, message };
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) {
    return { ok: true, workshop: json as Record<string, unknown> };
  }

  const message =
    typeof json.error === "string"
      ? json.error
      : typeof json.message === "string"
        ? json.message
        : res.statusText || "Save workshop failed";

  return { ok: false, status: res.status, message };
}
