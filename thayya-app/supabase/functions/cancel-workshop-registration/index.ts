import {
  corsHeaders,
  requireAuthenticatedUser,
} from "../_shared/require-authenticated-user.ts";
import { isWorkshopUpcoming } from "../_shared/workshop-registration-rules.ts";

const LOG = "cancel-workshop-registration";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return uuidRe.test(s.trim());
}

type Body = {
  workshop_id?: string;
};

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

  const { data: workshop, error: workshopErr } = await admin
    .from("workshops")
    .select("id, date")
    .eq("id", workshopId)
    .maybeSingle();

  if (workshopErr) {
    console.error(`[${LOG}] load workshop`, workshopErr.message);
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

  const workshopDate = workshop.date != null ? String(workshop.date) : null;
  if (!isWorkshopUpcoming(workshopDate)) {
    return Response.json(
      { error: "You can only cancel bookings for upcoming workshops" },
      { status: 400, headers: corsHeaders },
    );
  }

  const { data: existing, error: existingErr } = await admin
    .from("workshop_registrations")
    .select(REGISTRATION_COLS)
    .eq("workshop_id", workshopId)
    .eq("user_id", user.id)
    .maybeSingle<RegistrationRow>();

  if (existingErr) {
    console.error(`[${LOG}] registration`, existingErr.message);
    return Response.json(
      { error: existingErr.message },
      { status: 500, headers: corsHeaders },
    );
  }
  if (!existing) {
    return Response.json(
      { error: "You are not registered for this workshop" },
      { status: 404, headers: corsHeaders },
    );
  }
  if (existing.status === "cancelled") {
    return Response.json(
      { registration: existing, already_cancelled: true },
      { headers: corsHeaders },
    );
  }

  const { data: registration, error: updateErr } = await admin
    .from("workshop_registrations")
    .update({
      status: "cancelled",
      attended_at: null,
      attended_by: null,
    })
    .eq("id", existing.id)
    .select(REGISTRATION_COLS)
    .single<RegistrationRow>();

  if (updateErr || !registration) {
    console.error(`[${LOG}] cancel`, updateErr?.message ?? "unknown");
    return Response.json(
      { error: updateErr?.message ?? "Could not cancel booking" },
      { status: 400, headers: corsHeaders },
    );
  }

  return Response.json(
    { registration, already_cancelled: false },
    { headers: corsHeaders },
  );
});
