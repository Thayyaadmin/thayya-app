import { getSupabaseEnv } from "@/lib/supabase-env";

export type RegisterWorkshopResult =
  | { ok: true; alreadyRegistered: boolean }
  | { ok: false; status: number; message: string };

/**
 * POST to the `register-workshop` Edge Function for the signed-in user.
 */
export async function postRegisterWorkshopEdge(
  accessToken: string,
  workshopId: string,
): Promise<RegisterWorkshopResult> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const url = `${supabaseUrl}/functions/v1/register-workshop`;
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
    return { ok: false, status: 0, message };
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) {
    return {
      ok: true,
      alreadyRegistered: json.already_registered === true,
    };
  }

  const message =
    typeof json.error === "string"
      ? json.error
      : res.statusText || "Registration failed";

  return { ok: false, status: res.status, message };
}
