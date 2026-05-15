import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 128;

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return uuidRe.test(s.trim());
}

function normalizeSlug(raw: string | null): string | null {
  if (raw === null) return null;
  const s = raw.trim().toLowerCase();
  if (s.length === 0 || s.length > SLUG_MAX) return null;
  if (!SLUG_RE.test(s)) return null;
  return s;
}

const WORKSHOP_SELECT =
  "id, slug, title, date, price, slots, instructor_id, instructor, location, venue_name, address_line, city, state, country, created_at, updated_at, instructor_profile:profiles!instructor_id(id, full_name, slug, avatar_url, bio, user_type)";

type WorkshopRow = {
  id: string;
  slug: string | null;
  title: string | null;
  date: string | null;
  price: number | string | null;
  slots: number;
  instructor_id: string;
  instructor: string | null;
  location: unknown;
  venue_name: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
  instructor_profile: {
    id: string;
    full_name: string | null;
    slug: string | null;
    avatar_url: string | null;
    bio: string | null;
    user_type: string;
  } | null;
};

function buildWorkshopPayload(
  row: WorkshopRow,
  taken: number,
) {
  const slots = typeof row.slots === "number" ? row.slots : 0;
  const spotsRemaining = Math.max(0, slots - taken);

  let isPast = false;
  if (row.date) {
    const when = new Date(String(row.date));
    if (Number.isFinite(when.getTime()) && when.getTime() < Date.now()) {
      isPast = true;
    }
  }

  const profile = row.instructor_profile;
  const instructorName =
    (profile?.full_name && String(profile.full_name)) ||
    (row.instructor != null && String(row.instructor)) ||
    null;

  const instructor =
    profile &&
    (profile.user_type === "instructor" || profile.user_type === "admin")
      ? {
          id: profile.id,
          full_name: profile.full_name,
          slug: profile.slug,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
        }
      : null;

  const workshop = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.date,
    price: row.price,
    slots,
    spots_taken: taken,
    spots_remaining: spotsRemaining,
    is_full: taken >= slots,
    is_past: isPast,
    instructor_id: row.instructor_id,
    instructor_name: instructorName,
    location: row.location,
    venue_name: row.venue_name,
    address_line: row.address_line,
    city: row.city,
    state: row.state,
    country: row.country,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  return { workshop, instructor };
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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) {
    return Response.json(
      {
        error:
          "Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500, headers: corsHeaders },
    );
  }

  const reqUrl = new URL(req.url);
  const slug = normalizeSlug(reqUrl.searchParams.get("slug"));
  const rawId = reqUrl.searchParams.get("id");
  const workshopId =
    typeof rawId === "string" && rawId.trim() ? rawId.trim() : "";

  if (!slug && (!workshopId || !isUuid(workshopId))) {
    return Response.json(
      { error: "slug or id (uuid) is required" },
      { status: 400, headers: corsHeaders },
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = admin.from("workshops").select(WORKSHOP_SELECT);
  if (slug) {
    query = query.eq("slug", slug);
  } else {
    query = query.eq("id", workshopId);
  }

  const { data: row, error: workshopErr } = await query.maybeSingle<WorkshopRow>();

  if (workshopErr) {
    console.error("[workshop-public] workshop", workshopErr.message);
    return Response.json(
      { error: workshopErr.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!row) {
    return Response.json({ error: "not_found" }, { status: 404, headers: corsHeaders });
  }

  const { count: spotsTaken, error: countErr } = await admin
    .from("workshop_registrations")
    .select("id", { count: "exact", head: true })
    .eq("workshop_id", row.id)
    .eq("status", "active");

  if (countErr) {
    console.error("[workshop-public] count", countErr.message);
    return Response.json(
      { error: countErr.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const taken = spotsTaken ?? 0;
  const { workshop, instructor } = buildWorkshopPayload(row, taken);

  let viewer: { is_registered: boolean } | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token && token !== anonKey) {
      const userClient = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
        error: userErr,
      } = await userClient.auth.getUser();
      if (!userErr && user) {
        const { data: registration, error: regErr } = await admin
          .from("workshop_registrations")
          .select("status")
          .eq("workshop_id", row.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (regErr) {
          console.error("[workshop-public] viewer registration", regErr.message);
        } else {
          viewer = {
            is_registered: registration?.status === "active",
          };
        }
      }
    }
  }

  return Response.json({ workshop, instructor, viewer }, { headers: corsHeaders });
});
