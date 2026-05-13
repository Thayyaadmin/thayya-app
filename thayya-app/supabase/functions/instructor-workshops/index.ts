import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SELECT_COLS =
  "id, title, date, price, instructor_id, instructor, slots, location, address_line, city, state, country, created_at, updated_at";

const FETCH_CAP = 500;

type WorkshopRow = Record<string, unknown> & {
  date?: string | null;
  created_at?: string | null;
};

function dateMs(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

function createdMs(raw: string | null | undefined): number {
  if (raw == null || raw === "") return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Upcoming (future or undated) first — dated future ascending, then undated, then past newest first. */
function sortWorkshopsUpcomingFirst(rows: WorkshopRow[]): WorkshopRow[] {
  const now = Date.now();
  const scored = rows.map((r) => {
    const ms = dateMs(r.date as string | null | undefined);
    const upcoming = ms === null || ms >= now;
    return { r, ms, upcoming };
  });

  const upcoming = scored.filter((x) => x.upcoming);
  const past = scored.filter((x) => !x.upcoming);

  upcoming.sort((a, b) => {
    const aHas = a.ms !== null;
    const bHas = b.ms !== null;
    if (aHas && bHas && a.ms! !== b.ms!) return a.ms! - b.ms!;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    return createdMs(b.r.created_at as string | null) - createdMs(a.r.created_at as string | null);
  });

  past.sort((a, b) => (b.ms ?? 0) - (a.ms ?? 0));

  return [...upcoming, ...past].map((x) => x.r);
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
    console.error("[instructor-workshops] caller profile", callerErr.message);
    return Response.json({ error: callerErr.message }, { status: 500, headers: corsHeaders });
  }

  const callerType = callerProfile?.user_type;
  if (callerType !== "instructor" && callerType !== "admin") {
    return Response.json(
      { error: "Only instructors or admins can list instructor workshops" },
      { status: 403, headers: corsHeaders },
    );
  }

  const { data, error } = await admin
    .from("workshops")
    .select(SELECT_COLS)
    .eq("instructor_id", user.id)
    .limit(FETCH_CAP);

  if (error) {
    console.error("[instructor-workshops] fetch", error.message);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  const rows = (data ?? []) as WorkshopRow[];
  const workshops = sortWorkshopsUpcomingFirst(rows);

  return Response.json({ workshops }, { headers: corsHeaders });
});
