import {
  corsHeaders,
  FETCH_CAP,
  requireInstructorOrAdmin,
  SELECT_COLS,
} from "../_shared/instructor-workshops-gate.ts";

const LOG = "instructor-workshops-upcoming";

/** Same base columns as shared gate, plus profile join for dashboard display. */
const SELECT_WITH_PROFILE = `${SELECT_COLS}, instructor_profile:profiles!instructor_id(id, full_name, user_type, avatar_url)`;

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

  const gate = await requireInstructorOrAdmin(req, LOG);
  if (gate instanceof Response) return gate;
  const { admin, user } = gate;

  const nowIso = new Date().toISOString();

  const { data, error } = await admin
    .from("workshops")
    .select(SELECT_WITH_PROFILE)
    .eq("instructor_id", user.id)
    .or(`date.is.null,date.gte.${nowIso}`)
    .order("date", { ascending: true, nullsFirst: false })
    .limit(FETCH_CAP);

  if (error) {
    console.error(`[${LOG}] fetch`, error.message);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  const rows = data ?? [];
  const workshopIds = rows.map((w) => w.id as string).filter(Boolean);

  const takenByWorkshop = new Map<string, number>();
  if (workshopIds.length > 0) {
    const { data: registrations, error: regErr } = await admin
      .from("workshop_registrations")
      .select("workshop_id")
      .in("workshop_id", workshopIds)
      .eq("status", "active");

    if (regErr) {
      console.error(`[${LOG}] registration counts`, regErr.message);
      return Response.json(
        { error: regErr.message },
        { status: 500, headers: corsHeaders },
      );
    }

    for (const row of registrations ?? []) {
      const wid = row.workshop_id as string;
      takenByWorkshop.set(wid, (takenByWorkshop.get(wid) ?? 0) + 1);
    }
  }

  const workshops = rows.map((row) => {
    const id = row.id as string;
    const slots = typeof row.slots === "number" ? row.slots : 0;
    const taken = takenByWorkshop.get(id) ?? 0;
    const remaining = Math.max(0, slots - taken);
    return {
      ...row,
      spots_taken: taken,
      spots_remaining: remaining,
      is_full: slots > 0 && taken >= slots,
    };
  });

  return Response.json({ workshops }, { headers: corsHeaders });
});
