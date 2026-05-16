import { getSupabaseEnv } from "@/lib/supabase-env";

export type MyWorkshopRegistrationWorkshop = {
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

export type MyWorkshopRegistration = {
  registration_id: string;
  registered_at: string;
  /** Present on past workshops: user's 1–5 rating, or null if not yet rated. */
  review_rating?: number | null;
  attended?: boolean;
  can_mark_attendance?: boolean;
  workshop: MyWorkshopRegistrationWorkshop;
};

export type MyWorkshopRegistrationsPayload = {
  upcoming: MyWorkshopRegistration[];
  past: MyWorkshopRegistration[];
};

/**
 * GET **my-workshop-registrations** — active registrations for the signed-in user.
 */
export async function fetchMyWorkshopRegistrations(
  accessToken: string,
): Promise<{ data: MyWorkshopRegistrationsPayload | null; error: string | null }> {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const endpoint = `${supabaseUrl}/functions/v1/my-workshop-registrations`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const payload = (await res.json()) as {
      upcoming?: MyWorkshopRegistration[];
      past?: MyWorkshopRegistration[];
      error?: string;
    };

    if (!res.ok) {
      return {
        data: null,
        error: payload.error || res.statusText || "Unable to load your bookings.",
      };
    }

    return {
      data: {
        upcoming: Array.isArray(payload.upcoming) ? payload.upcoming : [],
        past: Array.isArray(payload.past) ? payload.past : [],
      },
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to load your bookings.";
    return { data: null, error: message };
  }
}
