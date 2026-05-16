import {
  corsHeaders,
  requireAuthenticatedUser,
} from "../_shared/require-authenticated-user.ts";
import { canMarkSelfAttendance } from "../_shared/workshop-attendance-rules.ts";

const LOG = "mark-workshop-attendance";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return uuidRe.test(s.trim());
}

type Body = {
  workshop_id?: string;
  attended?: boolean;
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

  const gate = await requireAuthenticatedUser(req, LOG);
  if (gate instanceof Response) return gate;
  const { admin, user } = gate;

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
  if (typeof body.attended !== "boolean") {
    return Response.json(
      { error: "attended (boolean) is required" },
      { status: 400, headers: corsHeaders },
    );
  }

  const { data: workshop, error: workshopErr } = await admin
    .from("workshops")
    .select("id, date, instructor_id")
    .eq("id", workshopId)
    .maybeSingle();

  if (workshopErr) {
    console.error(`[${LOG}] workshop`, workshopErr.message);
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
      { error: "You cannot check in to a workshop you are teaching" },
      { status: 400, headers: corsHeaders },
    );
  }

  const workshopDate =
    workshop.date != null ? String(workshop.date) : null;
  if (!canMarkSelfAttendance(workshopDate)) {
    return Response.json(
      {
        error:
          "You can check in on the day of the workshop or after it has taken place",
      },
      { status: 400, headers: corsHeaders },
    );
  }

  const { data: registration, error: regErr } = await admin
    .from("workshop_registrations")
    .select("id, status")
    .eq("workshop_id", workshopId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (regErr) {
    console.error(`[${LOG}] registration`, regErr.message);
    return Response.json(
      { error: regErr.message },
      { status: 500, headers: corsHeaders },
    );
  }
  if (!registration || registration.status !== "active") {
    return Response.json(
      { error: "You must be registered for this workshop to check in" },
      { status: 403, headers: corsHeaders },
    );
  }

  const nowIso = new Date().toISOString();
  const patch = body.attended
    ? { attended_at: nowIso, attended_by: user.id }
    : { attended_at: null, attended_by: null };

  const { data: updated, error: updateErr } = await admin
    .from("workshop_registrations")
    .update(patch)
    .eq("id", registration.id)
    .select("id, workshop_id, user_id, attended_at, attended_by")
    .single();

  if (updateErr || !updated) {
    console.error(`[${LOG}] update`, updateErr?.message ?? "unknown");
    return Response.json(
      { error: updateErr?.message ?? "Could not update attendance" },
      { status: 400, headers: corsHeaders },
    );
  }

  return Response.json(
    {
      attended: updated.attended_at != null,
      attended_at: updated.attended_at,
    },
    { headers: corsHeaders },
  );
});
