import { getSupabaseEnv } from "@/lib/supabase-env";

export type MarkWorkshopAttendanceResult =
  | { ok: true; attended: boolean; attendedAt: string | null }
  | { ok: false; message: string };

/**
 * POST **mark-workshop-attendance** — signed-in member marks their own attendance.
 */
export async function postMarkWorkshopAttendance(
  accessToken: string,
  workshopId: string,
  attended: boolean,
): Promise<MarkWorkshopAttendanceResult> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const url = `${supabaseUrl}/functions/v1/mark-workshop-attendance`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workshop_id: workshopId, attended }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, message };
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) {
    return {
      ok: true,
      attended: json.attended === true,
      attendedAt:
        typeof json.attended_at === "string" ? json.attended_at : null,
    };
  }

  const message =
    typeof json.error === "string"
      ? json.error
      : res.statusText || "Could not update attendance";

  return { ok: false, message };
}
