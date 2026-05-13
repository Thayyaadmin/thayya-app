import type { SupabaseClient } from "@supabase/supabase-js";

const WORKSHOP_SELECT =
  "*, instructor_profile:profiles!instructor_id(id, full_name, user_type)";

export type DiscoverWorkshopRow = {
  id: string;
  title: string | null;
  date: string | null;
  price: number | string | null;
  instructor: string | null;
  instructor_name?: string | null;
  instructor_profile?: {
    id: string;
    full_name: string;
    user_type: string;
  } | null;
};

export type DiscoverInstructorRow = {
  id: string;
  full_name: string;
  slug: string | null;
  bio: string | null;
  user_type: string;
};

export async function fetchDiscoverWorkshops(
  supabase: SupabaseClient,
): Promise<{ data: DiscoverWorkshopRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("workshops")
    .select(WORKSHOP_SELECT);

  if (error) {
    return { data: [], error: error.message || "Unable to fetch workshops." };
  }
  return { data: Array.isArray(data) ? (data as DiscoverWorkshopRow[]) : [], error: null };
}

export async function fetchDiscoverInstructors(
  supabase: SupabaseClient,
): Promise<{ data: DiscoverInstructorRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, slug, bio, user_type")
    .eq("user_type", "instructor")
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    return { data: [], error: error.message || "Unable to fetch instructors." };
  }
  return {
    data: Array.isArray(data) ? (data as DiscoverInstructorRow[]) : [],
    error: null,
  };
}
