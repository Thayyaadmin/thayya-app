import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const SELECT_COLS =
  "id, title, date, price, instructor_id, instructor, slots, location, venue_name, address_line, city, state, country, created_at, updated_at";

export const FETCH_CAP = 500;

/** @returns `{ admin, user }` or an error `Response` */
export async function requireInstructorOrAdmin(
  req: Request,
  logTag: string,
): Promise<{ admin: SupabaseClient; user: User } | Response> {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return Response.json(
      {
        error:
          "Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY",
      },
      { status: 500, headers: corsHeaders },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401, headers: corsHeaders },
    );
  }

  const userClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return Response.json({ error: "Invalid or expired session" }, { status: 401, headers: corsHeaders });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerProfile, error: callerErr } = await admin
    .from("profiles")
    .select("id, user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (callerErr) {
    console.error(`[${logTag}] caller profile`, callerErr.message);
    return Response.json({ error: callerErr.message }, { status: 500, headers: corsHeaders });
  }

  const callerType = callerProfile?.user_type;
  if (callerType !== "instructor" && callerType !== "admin") {
    return Response.json(
      { error: "Only instructors or admins can list instructor workshops" },
      { status: 403, headers: corsHeaders },
    );
  }

  return { admin, user };
}
