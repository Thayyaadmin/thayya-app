import { getSupabaseEnv } from "@/lib/supabase-env";

export type PublicInstructorProfile = {
  id: string;
  user_type: string;
  full_name: string;
  bio: string | null;
  slug: string | null;
  avatar_url: string | null;
  rating_avg: number | null;
  rating_count: number;
};

export type PublicInstructorWorkshop = {
  id: string;
  slug: string | null;
  title: string | null;
  date: string | null;
  price: number | null;
};

export type PublicInstructorPayload = {
  profile: PublicInstructorProfile;
  workshops: PublicInstructorWorkshop[];
};

/**
 * Public instructor page + upcoming workshops via **instructor-public** Edge Function
 * (service role), so signed-out visitors work without RLS changes on profiles/workshops.
 */
export async function fetchPublicInstructorBySlug(
  slug: string,
): Promise<{ data: PublicInstructorPayload | null; error: string | null }> {
  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const params = new URLSearchParams();
    params.set("slug", slug);
    const endpoint = `${supabaseUrl}/functions/v1/instructor-public?${params.toString()}`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      next: { revalidate: 60 },
    });

    const payload = (await res.json()) as {
      profile?: PublicInstructorProfile;
      workshops?: PublicInstructorWorkshop[];
      error?: string;
    };

    if (res.status === 404) {
      return { data: null, error: null };
    }

    if (!res.ok) {
      return {
        data: null,
        error: payload.error || res.statusText || "Unable to load instructor.",
      };
    }

    if (!payload.profile || !Array.isArray(payload.workshops)) {
      return { data: null, error: "Invalid response from instructor-public." };
    }

    const profile: PublicInstructorProfile = {
      ...payload.profile,
      rating_avg:
        typeof payload.profile.rating_avg === "number"
          ? payload.profile.rating_avg
          : null,
      rating_count:
        typeof payload.profile.rating_count === "number"
          ? payload.profile.rating_count
          : 0,
    };

    return {
      data: { profile, workshops: payload.workshops },
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unable to load instructor.";
    return { data: null, error: message };
  }
}
