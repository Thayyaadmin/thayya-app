import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type InstructorRatingSummary = {
  rating_avg: number | null;
  rating_count: number;
};

type ReviewRow = { instructor_id: string; rating: number };

/** Average rating + count per instructor id (from workshop_reviews). */
export async function fetchInstructorRatingSummaries(
  admin: SupabaseClient,
  instructorIds: string[],
): Promise<Map<string, InstructorRatingSummary>> {
  const result = new Map<string, InstructorRatingSummary>();
  const ids = [...new Set(instructorIds.filter(Boolean))];
  if (ids.length === 0) return result;

  const { data, error } = await admin
    .from("workshop_reviews")
    .select("instructor_id, rating")
    .in("instructor_id", ids);

  if (error) {
    console.error("[instructor-ratings] fetch", error.message);
    return result;
  }

  const sums = new Map<string, { sum: number; count: number }>();
  for (const row of (data ?? []) as ReviewRow[]) {
    const id = row.instructor_id;
    const rating = Number(row.rating);
    if (!id || !Number.isFinite(rating)) continue;
    const cur = sums.get(id) ?? { sum: 0, count: 0 };
    cur.sum += rating;
    cur.count += 1;
    sums.set(id, cur);
  }

  for (const id of ids) {
    const agg = sums.get(id);
    if (!agg || agg.count === 0) {
      result.set(id, { rating_avg: null, rating_count: 0 });
    } else {
      result.set(id, {
        rating_avg: Math.round((agg.sum / agg.count) * 10) / 10,
        rating_count: agg.count,
      });
    }
  }

  return result;
}

export function attachRatingToInstructor<T extends { id: string }>(
  instructor: T,
  summaries: Map<string, InstructorRatingSummary>,
): T & InstructorRatingSummary {
  const summary = summaries.get(instructor.id) ?? {
    rating_avg: null,
    rating_count: 0,
  };
  return { ...instructor, ...summary };
}
