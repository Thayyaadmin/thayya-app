import type { SupabaseClient, User } from "npm:@supabase/supabase-js@2";
import {
  requireAuthenticatedUser,
  corsHeaders,
} from "./require-authenticated-user.ts";

/** @returns `{ admin, user }` or an error `Response` */
export async function requireAdmin(
  req: Request,
  logTag: string,
): Promise<{ admin: SupabaseClient; user: User } | Response> {
  const auth = await requireAuthenticatedUser(req, logTag);
  if (auth instanceof Response) return auth;

  const { admin, user } = auth;

  const { data: callerProfile, error: callerErr } = await admin
    .from("profiles")
    .select("id, user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (callerErr) {
    console.error(`[${logTag}] admin check`, callerErr.message);
    return Response.json(
      { error: callerErr.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (callerProfile?.user_type !== "admin") {
    return Response.json(
      { error: "Only admins can manage instructors" },
      { status: 403, headers: corsHeaders },
    );
  }

  return { admin, user };
}
