import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type InstructorRatingRow = {
  rating_avg: number | string | null;
  rating_count: number;
};

function roundRatingAvg(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Incrementally update profiles.rating_avg / rating_count after a review is saved.
 * `previousRating` is null for a new review, or the prior 1–5 value when updating.
 */
export async function updateInstructorRatingCache(
  admin: SupabaseClient,
  instructorId: string,
  newRating: number,
  previousRating: number | null,
): Promise<{ error: string | null }> {
  const { data: instructor, error: loadErr } = await admin
    .from("profiles")
    .select("rating_avg, rating_count")
    .eq("id", instructorId)
    .maybeSingle<InstructorRatingRow>();

  if (loadErr) {
    return { error: loadErr.message };
  }
  if (!instructor) {
    return { error: "Instructor profile not found" };
  }

  const oldCount =
    typeof instructor.rating_count === "number" ? instructor.rating_count : 0;
  const oldAvg =
    instructor.rating_avg != null && instructor.rating_avg !== ""
      ? Number(instructor.rating_avg)
      : null;

  let newCount: number;
  let newAvg: number | null;

  if (previousRating === null) {
    newCount = oldCount + 1;
    newAvg =
      oldCount === 0 || oldAvg === null || !Number.isFinite(oldAvg)
        ? newRating
        : roundRatingAvg((oldAvg * oldCount + newRating) / newCount);
  } else {
    newCount = oldCount;
    newAvg =
      newCount <= 0 || oldAvg === null || !Number.isFinite(oldAvg)
        ? newRating
        : roundRatingAvg((oldAvg * oldCount - previousRating + newRating) / newCount);
  }

  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      rating_count: newCount,
      rating_avg: newAvg,
    })
    .eq("id", instructorId);

  if (updateErr) {
    return { error: updateErr.message };
  }

  return { error: null };
}
