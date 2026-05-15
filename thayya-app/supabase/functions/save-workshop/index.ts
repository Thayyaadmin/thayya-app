import { createClient } from "npm:@supabase/supabase-js@2";
import { allocateWorkshopSlug } from "../_shared/workshop-slug.ts";
import { normalizeWorkshopTags } from "../_shared/workshop-tags.ts";

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
  intent?: string;
  id?: string | null;
  title?: string;
  date?: string | null;
  price?: number | null;
  slots?: number;
  location?: GeoJsonPoint | null;
  /** Human-readable venue label (e.g. "Studio 5"). */
  venue_name?: string | null;
  /** Venue / address text (same shape as `profiles`). */
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  /** Create + admin only: assign workshop to this profile id. */
  instructor_id?: string | null;
  /** Full tag list for this workshop (replaces existing on update). */
  tags?: string[] | null;
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

/** PostgREST + `geography(Point,4326)` reliably accepts EWKT; raw GeoJSON often
 *  triggers "invalid geometry". Mirrors the pattern in register-user-profile. */
function pointToEwkt(geo: GeoJsonPoint): string {
  const [lng, lat] = geo.coordinates;
  return `SRID=4326;POINT(${lng} ${lat})`;
}

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return uuidRe.test(s.trim());
}

/** Normalised text or null; used on create when the field may be omitted. */
function optionalTrimmedText(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

const OMIT = Symbol("omit");

/** On update: if the key was not sent in JSON, do not change the column. */
function textFieldForPatch(
  body: Body,
  key: "venue_name" | "address_line" | "city" | "state" | "country",
): string | null | typeof OMIT {
  if (!Object.prototype.hasOwnProperty.call(body, key)) return OMIT;
  return optionalTrimmedText(body[key]);
}

const selectCols =
  "id, slug, title, date, price, instructor_id, instructor, slots, tags, location, venue_name, address_line, city, state, country, created_at, updated_at";

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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
  }

  const intent = body.intent === "update" ? "update" : "create";

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return Response.json({ error: "title is required" }, { status: 400, headers: corsHeaders });
  }

  const slotsRaw = body.slots;
  let slots = 20;
  if (slotsRaw !== undefined && slotsRaw !== null) {
    const n = typeof slotsRaw === "number" ? slotsRaw : Number(slotsRaw);
    if (!Number.isInteger(n) || n < 1) {
      return Response.json(
        { error: "slots must be a positive integer" },
        { status: 400, headers: corsHeaders },
      );
    }
    slots = n;
  }

  const date =
    body.date === undefined || body.date === null || body.date === ""
      ? null
      : String(body.date);

  let price: number | null = null;
  if (body.price !== undefined && body.price !== null && body.price !== "") {
    const p = typeof body.price === "number" ? body.price : Number(body.price);
    if (!Number.isFinite(p)) {
      return Response.json({ error: "Invalid price" }, { status: 400, headers: corsHeaders });
    }
    price = p;
  }

  const locationSent = Object.prototype.hasOwnProperty.call(body, "location");
  const location = locationSent ? parseGeoPoint(body.location ?? null) : null;

  const venue_name = optionalTrimmedText(body.venue_name);
  const address_line = optionalTrimmedText(body.address_line);
  const city = optionalTrimmedText(body.city);
  const state = optionalTrimmedText(body.state);
  const country = optionalTrimmedText(body.country);

  const tagsSent = Object.prototype.hasOwnProperty.call(body, "tags");
  const tags = tagsSent ? normalizeWorkshopTags(body.tags) : null;

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
    .select("id, user_type, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (callerErr) {
    console.error("[save-workshop] caller profile", callerErr.message);
    return Response.json({ error: callerErr.message }, { status: 500, headers: corsHeaders });
  }

  const callerType = callerProfile?.user_type;
  if (callerType !== "instructor" && callerType !== "admin") {
    return Response.json(
      { error: "Only instructors or admins can save workshops" },
      { status: 403, headers: corsHeaders },
    );
  }

  if (intent === "update") {
    const workshopId =
      typeof body.id === "string" && body.id.trim() ? body.id.trim() : "";
    if (!workshopId || !isUuid(workshopId)) {
      return Response.json(
        { error: "Valid workshop id is required for update" },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: existing, error: loadErr } = await admin
      .from("workshops")
      .select("id, instructor_id")
      .eq("id", workshopId)
      .maybeSingle();

    if (loadErr) {
      console.error("[save-workshop] load workshop", loadErr.message);
      return Response.json({ error: loadErr.message }, { status: 500, headers: corsHeaders });
    }
    if (!existing) {
      return Response.json({ error: "Workshop not found" }, { status: 404, headers: corsHeaders });
    }

    const ownerId = existing.instructor_id as string | null;
    if (callerType === "instructor") {
      if (ownerId !== user.id) {
        return Response.json(
          { error: "You can only edit workshops you own" },
          { status: 403, headers: corsHeaders },
        );
      }
    }

    const patch: Record<string, unknown> = {
      title,
      date,
      price,
      slots,
    };

    if (locationSent) {
      patch.location = location ? pointToEwkt(location) : null;
    }

    for (
      const key of [
        "venue_name",
        "address_line",
        "city",
        "state",
        "country",
      ] as const
    ) {
      const v = textFieldForPatch(body, key);
      if (v !== OMIT) patch[key] = v;
    }

    if (tagsSent) {
      patch.tags = tags;
    }

    const { data: row, error: updateErr } = await admin
      .from("workshops")
      .update(patch)
      .eq("id", workshopId)
      .select(selectCols)
      .single();

    if (updateErr) {
      console.error("[save-workshop] update", updateErr.message);
      return Response.json({ error: updateErr.message }, { status: 400, headers: corsHeaders });
    }

    return Response.json(row, { headers: corsHeaders });
  }

  // --- create ---
  let instructorId = user.id;
  const requestedAssign = body.instructor_id;

  if (callerType === "admin") {
    if (
      typeof requestedAssign === "string" &&
      requestedAssign.trim() &&
      isUuid(requestedAssign)
    ) {
      instructorId = requestedAssign.trim();
    }
  } else {
    if (
      typeof requestedAssign === "string" &&
      requestedAssign.trim() &&
      requestedAssign.trim() !== user.id
    ) {
      return Response.json(
        { error: "Instructors cannot create workshops for another user" },
        { status: 403, headers: corsHeaders },
      );
    }
  }

  const { data: targetProfile, error: targetErr } = await admin
    .from("profiles")
    .select("id, user_type, full_name")
    .eq("id", instructorId)
    .maybeSingle();

  if (targetErr) {
    console.error("[save-workshop] target profile", targetErr.message);
    return Response.json({ error: targetErr.message }, { status: 500, headers: corsHeaders });
  }
  if (!targetProfile) {
    return Response.json(
      { error: "Instructor profile not found for instructor_id" },
      { status: 400, headers: corsHeaders },
    );
  }
  if (targetProfile.user_type !== "instructor" && targetProfile.user_type !== "admin") {
    return Response.json(
      { error: "Workshop instructor must be an instructor or admin profile" },
      { status: 400, headers: corsHeaders },
    );
  }

  const instructorName =
    typeof targetProfile.full_name === "string" && targetProfile.full_name.trim()
      ? targetProfile.full_name.trim()
      : "Instructor";

  let workshopSlug: string;
  try {
    workshopSlug = await allocateWorkshopSlug(admin, title);
  } catch (slugErr) {
    const msg = slugErr instanceof Error ? slugErr.message : "Could not allocate slug";
    console.error("[save-workshop] slug", msg);
    return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
  }

  const insertRow: Record<string, unknown> = {
    title,
    slug: workshopSlug,
    date,
    price,
    instructor_id: instructorId,
    instructor: instructorName,
    slots,
    location: location ? pointToEwkt(location) : null,
    venue_name,
    address_line,
    city,
    state,
    country,
    tags: tags ?? [],
  };

  const { data: row, error: insertErr } = await admin
    .from("workshops")
    .insert(insertRow)
    .select(selectCols)
    .single();

  if (insertErr) {
    console.error("[save-workshop] insert", insertErr.message);
    return Response.json({ error: insertErr.message }, { status: 400, headers: corsHeaders });
  }

  return Response.json(row, { headers: corsHeaders });
});
