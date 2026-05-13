import {
  corsHeaders,
  FETCH_CAP,
  requireInstructorOrAdmin,
  SELECT_COLS,
} from "../_shared/instructor-workshops-gate.ts";

const LOG = "instructor-workshops-past";

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
    .select(SELECT_COLS)
    .eq("instructor_id", user.id)
    .not("date", "is", null)
    .lt("date", nowIso)
    .order("date", { ascending: false })
    .limit(FETCH_CAP);

  if (error) {
    console.error(`[${LOG}] fetch`, error.message);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ workshops: data ?? [] }, { headers: corsHeaders });
});
