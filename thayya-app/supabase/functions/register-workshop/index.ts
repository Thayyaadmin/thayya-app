import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  workshop_id?: string;
};

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return uuidRe.test(s.trim());
}

const REGISTRATION_COLS = "id, workshop_id, user_id, status, created_at";

type RegistrationRow = {
  id: string;
  workshop_id: string;
  user_id: string;
  status: "active" | "cancelled";
  created_at: string;
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
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders },
    );
  }

  const workshopId =
    typeof body.workshop_id === "string" && body.workshop_id.trim()
      ? body.workshop_id.trim()
      : "";
  if (!workshopId || !isUuid(workshopId)) {
    return Response.json(
      { error: "workshop_id (uuid) is required" },
      { status: 400, headers: corsHeaders },
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
    return Response.json(
      { error: "Invalid or expired session" },
      { status: 401, headers: corsHeaders },
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Caller must have a profile (FK requires it). Any authenticated user with a
  // profile can register; the self-registration check below blocks instructors
  // from signing up for their own workshop.
  const { data: callerProfile, error: callerErr } = await admin
    .from("profiles")
    .select("id, user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (callerErr) {
    console.error("[register-workshop] caller profile", callerErr.message);
    return Response.json(
      { error: callerErr.message },
      { status: 500, headers: corsHeaders },
    );
  }
  if (!callerProfile) {
    return Response.json(
      { error: "Complete your profile before registering for a workshop" },
      { status: 403, headers: corsHeaders },
    );
  }

  const { data: workshop, error: workshopErr } = await admin
    .from("workshops")
    .select("id, title, date, slots, instructor_id")
    .eq("id", workshopId)
    .maybeSingle();

  if (workshopErr) {
    console.error("[register-workshop] load workshop", workshopErr.message);
    return Response.json(
      { error: workshopErr.message },
      { status: 500, headers: corsHeaders },
    );
  }
  if (!workshop) {
    return Response.json(
      { error: "Workshop not found" },
      { status: 404, headers: corsHeaders },
    );
  }

  if (workshop.instructor_id === user.id) {
    return Response.json(
      { error: "You cannot register for a workshop you are running" },
      { status: 400, headers: corsHeaders },
    );
  }

  if (workshop.date) {
    const when = new Date(String(workshop.date));
    if (Number.isFinite(when.getTime()) && when.getTime() < Date.now()) {
      return Response.json(
        { error: "This workshop has already taken place" },
        { status: 400, headers: corsHeaders },
      );
    }
  }

  // Existing row lookup: a (user, workshop) pair has at most one row for its
  // whole lifetime. Cancellation flips `status` to 'cancelled' in place; a
  // subsequent re-register flips it back to 'active'.
  const { data: existing, error: existingErr } = await admin
    .from("workshop_registrations")
    .select(REGISTRATION_COLS)
    .eq("workshop_id", workshopId)
    .eq("user_id", user.id)
    .maybeSingle<RegistrationRow>();

  if (existingErr) {
    console.error("[register-workshop] existing", existingErr.message);
    return Response.json(
      { error: existingErr.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (existing && existing.status === "active") {
    return Response.json(
      { registration: existing, already_registered: true },
      { status: 200, headers: corsHeaders },
    );
  }

  // Capacity check — only `active` rows count against `slots`. Best-effort:
  // under heavy concurrent traffic two requests can both pass this check
  // before either write lands, so a workshop may end up one or two
  // registrations over `slots`. Acceptable trade-off given the requirement to
  // keep the database simple (no row-level locks / RPCs).
  const { count, error: countErr } = await admin
    .from("workshop_registrations")
    .select("id", { count: "exact", head: true })
    .eq("workshop_id", workshopId)
    .eq("status", "active");

  if (countErr) {
    console.error("[register-workshop] count", countErr.message);
    return Response.json(
      { error: countErr.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const slots = typeof workshop.slots === "number" ? workshop.slots : 0;
  if ((count ?? 0) >= slots) {
    return Response.json(
      { error: "This workshop is fully booked" },
      { status: 409, headers: corsHeaders },
    );
  }

  // Re-activate a previously cancelled registration in place.
  if (existing && existing.status === "cancelled") {
    const { data: reactivated, error: updateErr } = await admin
      .from("workshop_registrations")
      .update({ status: "active" })
      .eq("id", existing.id)
      .select(REGISTRATION_COLS)
      .single<RegistrationRow>();

    if (updateErr) {
      console.error("[register-workshop] reactivate", updateErr.message);
      return Response.json(
        { error: updateErr.message },
        { status: 400, headers: corsHeaders },
      );
    }

    return Response.json(
      { registration: reactivated, already_registered: false },
      { headers: corsHeaders },
    );
  }

  const { data: registration, error: insertErr } = await admin
    .from("workshop_registrations")
    .insert({ workshop_id: workshopId, user_id: user.id, status: "active" })
    .select(REGISTRATION_COLS)
    .single<RegistrationRow>();

  if (insertErr) {
    // 23505 = unique_violation. Race against another concurrent insert by the
    // same user; treat as a successful idempotent registration.
    if ((insertErr as { code?: string }).code === "23505") {
      const { data: dupe } = await admin
        .from("workshop_registrations")
        .select(REGISTRATION_COLS)
        .eq("workshop_id", workshopId)
        .eq("user_id", user.id)
        .maybeSingle<RegistrationRow>();
      if (dupe && dupe.status === "active") {
        return Response.json(
          { registration: dupe, already_registered: true },
          { status: 200, headers: corsHeaders },
        );
      }
    }
    console.error("[register-workshop] insert", insertErr.message);
    return Response.json(
      { error: insertErr.message },
      { status: 400, headers: corsHeaders },
    );
  }

  return Response.json(
    { registration, already_registered: false },
    { headers: corsHeaders },
  );
});
