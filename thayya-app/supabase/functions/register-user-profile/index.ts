import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type GeoJsonPoint = {
  type: "Point";
  coordinates: [number, number];
};

type Body = {
  user_type?: string;
  full_name?: string;
  bio?: string | null;
  primary_location?: GeoJsonPoint | null;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

function parseGeoPoint(p: unknown): GeoJsonPoint | null {
  if (p == null) return null;
  if (typeof p !== "object" || p === null) return null;
  const o = p as Record<string, unknown>;
  if (o.type !== "Point" || !Array.isArray(o.coordinates)) return null;
  const c = o.coordinates as unknown[];
  if (c.length < 2) return null;
  const lng = Number(c[0]);
  const lat = Number(c[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { type: "Point", coordinates: [lng, lat] };
}

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

  const userType = body.user_type;
  if (userType !== "member" && userType !== "instructor") {
    return Response.json(
      { error: "user_type must be member or instructor" },
      { status: 400, headers: corsHeaders },
    );
  }

  const geo = parseGeoPoint(body.primary_location ?? null);
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";

  if (userType === "instructor") {
    if (!geo) {
      return Response.json(
        {
          error:
            "Instructors must provide primary_location as GeoJSON Point { type: \"Point\", coordinates: [lng, lat] }",
        },
        { status: 400, headers: corsHeaders },
      );
    }
    if (!city || !country) {
      return Response.json(
        { error: "Instructors must provide city and country from the address" },
        { status: 400, headers: corsHeaders },
      );
    }
  }

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
    user_type: userType,
    full_name: fullName,
    primary_location: geo,
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
      "id, user_type, full_name, bio, slug, primary_location, address_line, city, state, country, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("[register-user-profile]", error.message);
    return Response.json({ error: error.message }, { status: 400, headers: corsHeaders });
  }

  return Response.json(data, { headers: corsHeaders });
});
