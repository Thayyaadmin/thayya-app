import { getSupabaseEnv } from "@/lib/supabase-env";
import type { PrimaryLocationPayload } from "@/lib/primary-location";

export type AdminCreateInstructorBody = {
  intent?: "create" | "promote";
  email?: string;
  user_id?: string;
  full_name: string;
  bio?: string | null;
  category_ids?: string[];
  send_invite?: boolean;
  password?: string;
} & Partial<
  Pick<
    PrimaryLocationPayload,
    "primary_location" | "address_line" | "city" | "state" | "country"
  >
>;

export type AdminCreateInstructorResult = Record<string, unknown> & {
  invited?: boolean;
};

/**
 * Admin-only: create a new instructor (invite or password) or promote an existing member.
 * Requires the signed-in admin's access token.
 */
export async function adminCreateInstructor(
  accessToken: string,
  body: AdminCreateInstructorBody,
): Promise<AdminCreateInstructorResult> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const url = `${supabaseUrl}/functions/v1/admin-create-instructor`;
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
    throw new Error(
      typeof json.error === "string" ? json.error : res.statusText || "Instructor provisioning failed",
    );
  }
  return json as AdminCreateInstructorResult;
}
