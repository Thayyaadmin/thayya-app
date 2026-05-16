import { getSupabaseEnv } from "@/lib/supabase-env";
import type { PrimaryLocationPayload } from "@/lib/primary-location";

export type RegisterUserProfileBody = {
  full_name: string;
  bio?: string | null;
} & Partial<
  Pick<PrimaryLocationPayload, "primary_location" | "address_line" | "city" | "state" | "country">
>;

/**
 * Member onboarding: updates the signed-in user's profile via `register-user-profile`.
 * Requires a valid access token (same JWT as Supabase client).
 */
export async function registerUserProfile(
  accessToken: string,
  body: RegisterUserProfileBody,
): Promise<Record<string, unknown>> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const url = `${supabaseUrl}/functions/v1/register-user-profile`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(typeof json.error === "string" ? json.error : res.statusText || "Profile update failed");
  }
  return json as Record<string, unknown>;
}
