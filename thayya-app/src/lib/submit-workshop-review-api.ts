import { getSupabaseEnv } from "@/lib/supabase-env";

export type SubmitWorkshopReviewResult =
  | { ok: true; rating: number }
  | { ok: false; status: number; message: string };

/**
 * POST to the `submit-workshop-review` Edge Function for the signed-in user.
 */
export async function postSubmitWorkshopReviewEdge(
  accessToken: string,
  workshopId: string,
  rating: number,
): Promise<SubmitWorkshopReviewResult> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const url = `${supabaseUrl}/functions/v1/submit-workshop-review`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workshop_id: workshopId, rating }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 0, message };
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) {
    const review = json.review as { rating?: number } | undefined;
    const savedRating =
      typeof review?.rating === "number" ? review.rating : rating;
    return { ok: true, rating: savedRating };
  }

  const message =
    typeof json.error === "string"
      ? json.error
      : res.statusText || "Could not save your rating";

  return { ok: false, status: res.status, message };
}
