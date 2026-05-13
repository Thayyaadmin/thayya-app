import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_RADIUS_KM = 20;
/** Safety cap on rows read when doing in-memory distance filter. */
const NEARBY_FETCH_CAP = 1000;

type InstructorRow = {
  id: string;
  full_name: string;
  slug: string | null;
  bio: string | null;
  user_type: string;
};

type ProfileWithPin = InstructorRow & { primary_location?: unknown };

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

/** GeoJSON Point or EWKT from PostgREST / geography column. */
function coordsFromPoint(value: unknown): { lat: number; lng: number } | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const m = /^SRID=\d+;POINT\(([-.0-9eE+]+)\s+([-.0-9eE+]+)\)$/i.exec(value.trim());
    if (m) {
      const lng = Number(m[1]);
      const lat = Number(m[2]);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }
    return null;
  }
  if (typeof value === "object" && value !== null) {
    const o = value as { type?: string; coordinates?: unknown[] };
    if (o.type === "Point" && Array.isArray(o.coordinates) && o.coordinates.length >= 2) {
      const lng = Number(o.coordinates[0]);
      const lat = Number(o.coordinates[1]);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }
  }
  return null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const reqUrl = new URL(req.url);
  const viewer = parseViewerPoint(reqUrl);

  if (viewer) {
    const { data, error } = await admin
      .from("profiles")
      .select("id, full_name, slug, bio, user_type, primary_location")
      .eq("user_type", "instructor")
      .not("slug", "is", null)
      .not("primary_location", "is", null)
      .limit(NEARBY_FETCH_CAP);

    if (error) {
      console.error("[discover-instructors] nearby fetch", error.message);
      return Response.json(
        { error: error.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const rows = (data ?? []) as ProfileWithPin[];
    const ranked = rows
      .map((row) => {
        const c = coordsFromPoint(row.primary_location);
        if (!c) return null;
        const km = haversineKm(viewer.lat, viewer.lng, c.lat, c.lng);
        if (km > DEFAULT_RADIUS_KM) return null;
        return { row, km };
      })
      .filter((x): x is { row: ProfileWithPin; km: number } => x !== null)
      .sort((a, b) => a.km - b.km)
      .slice(0, 8);

    const instructors: InstructorRow[] = ranked.map(({ row }) => ({
      id: row.id,
      full_name: row.full_name,
      slug: row.slug,
      bio: row.bio,
      user_type: row.user_type,
    }));

    return Response.json(
      {
        instructors,
        search: "nearby" as const,
        radius_km: DEFAULT_RADIUS_KM,
      },
      { headers: corsHeaders },
    );
  }

  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, slug, bio, user_type")
    .eq("user_type", "instructor")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(8);

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
