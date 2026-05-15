import {
  corsHeaders,
  requireAuthenticatedUser,
} from "../_shared/require-authenticated-user.ts";

const LOG = "my-workshop-registrations";
const FETCH_CAP = 500;

const REGISTRATION_SELECT = `
  id,
  workshop_id,
  status,
  created_at,
  workshop:workshops!inner (
    id,
    slug,
    title,
    date,
    price,
    slots,
    venue_name,
    address_line,
    city,
    state,
    country,
    instructor_id,
    instructor,
    instructor_profile:profiles!instructor_id (
      id,
      full_name,
      slug,
      avatar_url
    )
  )
`;

type WorkshopEmbed = {
  id: string;
  slug: string | null;
  title: string | null;
  date: string | null;
  price: number | string | null;
  slots: number;
  venue_name: string | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  instructor_id: string;
  instructor: string | null;
  instructor_profile: {
    id: string;
    full_name: string | null;
    slug: string | null;
    avatar_url: string | null;
  } | null;
};

type RegistrationRow = {
  id: string;
  workshop_id: string;
  status: string;
  created_at: string;
  workshop: WorkshopEmbed;
};

export type RegistrationListItem = {
  registration_id: string;
  registered_at: string;
  workshop: {
    id: string;
    slug: string | null;
    title: string | null;
    date: string | null;
    price: number | string | null;
    slots: number;
    venue_name: string | null;
    address_line: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    instructor_id: string;
    instructor_name: string | null;
    instructor_slug: string | null;
    instructor_avatar_url: string | null;
  };
};

function mapRow(row: RegistrationRow): RegistrationListItem {
  const w = row.workshop;
  const profile = w.instructor_profile;
  const instructorName =
    (profile?.full_name && String(profile.full_name)) ||
    (w.instructor != null && String(w.instructor)) ||
    null;

  return {
    registration_id: row.id,
    registered_at: row.created_at,
    workshop: {
      id: w.id,
      slug: w.slug,
      title: w.title,
      date: w.date,
      price: w.price,
      slots: typeof w.slots === "number" ? w.slots : 0,
      venue_name: w.venue_name,
      address_line: w.address_line,
      city: w.city,
      state: w.state,
      country: w.country,
      instructor_id: w.instructor_id,
      instructor_name: instructorName,
      instructor_slug: profile?.slug ?? null,
      instructor_avatar_url: profile?.avatar_url ?? null,
    },
  };
}

function workshopTimeMs(dateValue: string | null): number | null {
  if (dateValue == null || dateValue === "") return null;
  const when = new Date(dateValue);
  const ms = when.getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Undated workshops count as upcoming; dated workshops on or after now are upcoming. */
function isUpcoming(dateValue: string | null, nowMs: number): boolean {
  const ms = workshopTimeMs(dateValue);
  if (ms === null) return true;
  return ms >= nowMs;
}

function compareRegisteredAt(
  a: RegistrationListItem,
  b: RegistrationListItem,
): number {
  return (
    new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime()
  );
}

/** Soonest workshop start first (nearest to now in the future); undated last. */
function sortUpcomingNearest(
  a: RegistrationListItem,
  b: RegistrationListItem,
): number {
  const ta = workshopTimeMs(a.workshop.date);
  const tb = workshopTimeMs(b.workshop.date);
  if (ta === null && tb === null) return compareRegisteredAt(a, b);
  if (ta === null) return 1;
  if (tb === null) return -1;
  if (ta !== tb) return ta - tb;
  return compareRegisteredAt(a, b);
}

/** Most recent workshop start first (nearest to now in the past). */
function sortPastNearest(
  a: RegistrationListItem,
  b: RegistrationListItem,
): number {
  const ta = workshopTimeMs(a.workshop.date);
  const tb = workshopTimeMs(b.workshop.date);
  if (ta === null && tb === null) return compareRegisteredAt(a, b);
  if (ta === null) return 1;
  if (tb === null) return -1;
  if (ta !== tb) return tb - ta;
  return compareRegisteredAt(a, b);
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

  const gate = await requireAuthenticatedUser(req, LOG);
  if (gate instanceof Response) return gate;
  const { admin, user } = gate;

  const { data, error } = await admin
    .from("workshop_registrations")
    .select(REGISTRATION_SELECT)
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(FETCH_CAP);

  if (error) {
    console.error(`[${LOG}] fetch`, error.message);
    return Response.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const nowMs = Date.now();
  const rows = (data ?? []) as RegistrationRow[];
  const mapped = rows.map(mapRow);

  const upcoming = mapped
    .filter((item) => isUpcoming(item.workshop.date, nowMs))
    .sort(sortUpcomingNearest);

  const past = mapped
    .filter((item) => !isUpcoming(item.workshop.date, nowMs))
    .sort(sortPastNearest);

  return Response.json({ upcoming, past }, { headers: corsHeaders });
});
