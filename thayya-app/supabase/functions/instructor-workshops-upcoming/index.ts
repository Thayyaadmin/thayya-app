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

  return Response.json({ workshops: data ?? [] }, { headers: corsHeaders });
});
