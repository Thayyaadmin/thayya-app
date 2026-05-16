import { getSupabaseEnv } from "@/lib/supabase-env";

export type CancelWorkshopRegistrationResult =
  | { ok: true; alreadyCancelled: boolean }
  | { ok: false; message: string };

/**
 * POST **cancel-workshop-registration** — cancel the signed-in user's booking.
 */
export async function postCancelWorkshopRegistration(
  accessToken: string,
  workshopId: string,
): Promise<CancelWorkshopRegistrationResult> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const url = `${supabaseUrl}/functions/v1/cancel-workshop-registration`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workshop_id: workshopId }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, message };
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) {
    return {
      ok: true,
      alreadyCancelled: json.already_cancelled === true,
    };
  }

  const message =
    typeof json.error === "string"
      ? json.error
      : res.statusText || "Could not cancel booking";

  return { ok: false, message };
}
