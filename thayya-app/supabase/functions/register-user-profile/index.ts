import { createClient } from "npm:@supabase/supabase-js@2";
import { parseGeoPoint, pointToEwkt } from "../_shared/geo-point.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  full_name?: string;
  bio?: string | null;
  primary_location?: unknown;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    return Response.json(
      { error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" },
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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
  }

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  if (!fullName) {
    return Response.json({ error: "full_name is required" }, { status: 400, headers: corsHeaders });
  }

  const geo = parseGeoPoint(body.primary_location ?? null);
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return Response.json({ error: "Invalid or expired session" }, { status: 401, headers: corsHeaders });
  }

  const address_line =
    typeof body.address_line === "string" && body.address_line.trim()
      ? body.address_line.trim()
      : null;
  const state =
    typeof body.state === "string" && body.state.trim() ? body.state.trim() : null;

  const patch: Record<string, unknown> = {
    user_type: "member",
    full_name: fullName,
    primary_location: geo ? pointToEwkt(geo) : null,
    address_line,
    city: city || null,
    state,
    country: country || null,
  };

  if (body.bio !== undefined) {
    patch.bio =
      typeof body.bio === "string" && body.bio.trim() ? body.bio.trim() : null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", user.id)
    .select(
      "id, user_type, full_name, bio, slug, avatar_url, primary_location, address_line, city, state, country, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("[register-user-profile]", error.message);
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }

  return Response.json(data, { headers: corsHeaders });
});
