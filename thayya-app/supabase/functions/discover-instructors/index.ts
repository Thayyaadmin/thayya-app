import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_RADIUS_KM = 20;
const MAX_RESULTS = 8;

type InstructorRow = {
  id: string;
  full_name: string;
  slug: string | null;
  bio: string | null;
  user_type: string;
  avatar_url: string | null;
};

type NearbyInstructorRow = InstructorRow & { distance_m: number | string };

function parseQueryNumber(url: URL, name: string): number | null {
  const raw = url.searchParams.get(name);
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseViewerPoint(url: URL): { lat: number; lng: number } | null {
  const lat = parseQueryNumber(url, "lat");
  const lng = parseQueryNumber(url, "lng");
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Lazily-built Postgres.js client reused across warm invocations in the same isolate.
 * Uses `SUPABASE_DB_URL` (the Supavisor transaction pooler), so we disable prepared
 * statements and keep pool size small.
 */
let sqlClient: ReturnType<typeof postgres> | null = null;
function getSql(): ReturnType<typeof postgres> {
  if (sqlClient) return sqlClient;
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    throw new Error(
      "Missing SUPABASE_DB_URL. This is automatically injected for Edge Functions on Supabase.",
    );
  }
  sqlClient = postgres(dbUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
  });
  return sqlClient;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return Response.json(
      {
        error:
          "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set the service role key as a function secret.",
      },
      { status: 500, headers: corsHeaders },
    );
  }

  const reqUrl = new URL(req.url);
  const viewer = parseViewerPoint(reqUrl);

  if (viewer) {
    const radiusMeters = DEFAULT_RADIUS_KM * 1000;
    try {
      const sql = getSql();
      const rows = (await sql<NearbyInstructorRow[]>`
        select
          id,
          full_name,
          slug,
          bio,
          user_type,
          avatar_url,
          st_distance(
            primary_location,
            st_setsrid(st_makepoint(${viewer.lng}, ${viewer.lat}), 4326)::geography
          ) as distance_m
        from public.profiles
        where user_type = 'instructor'
          and slug is not null
          and primary_location is not null
          and st_dwithin(
            primary_location,
            st_setsrid(st_makepoint(${viewer.lng}, ${viewer.lat}), 4326)::geography,
            ${radiusMeters}
          )
        order by distance_m asc
        limit ${MAX_RESULTS}
      `) as unknown as NearbyInstructorRow[];

      const instructors: InstructorRow[] = rows.map((row) => ({
        id: row.id,
        full_name: row.full_name,
        slug: row.slug,
        bio: row.bio,
        user_type: row.user_type,
        avatar_url: row.avatar_url ?? null,
      }));

      return Response.json(
        {
          instructors,
          search: "nearby" as const,
          radius_km: DEFAULT_RADIUS_KM,
        },
        { headers: corsHeaders },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[discover-instructors] nearby SQL", message);
      return Response.json(
        { error: message },
        { status: 500, headers: corsHeaders },
      );
    }
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, slug, bio, user_type, avatar_url")
    .eq("user_type", "instructor")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(MAX_RESULTS);

  if (error) {
    console.error("[discover-instructors]", error.message);
    return Response.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const instructors = (data ?? []) as InstructorRow[];

  return Response.json(
    { instructors, search: "featured" as const },
    { headers: corsHeaders },
  );
});
