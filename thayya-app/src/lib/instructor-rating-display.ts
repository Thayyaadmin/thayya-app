/** Format instructor average rating for display (e.g. "4.8" or "—"). */
export function formatInstructorRatingAvg(
  ratingAvg: number | null | undefined,
): string {
  if (ratingAvg == null || !Number.isFinite(ratingAvg)) return "—";
  return ratingAvg.toFixed(1);
}

export function formatInstructorRatingCount(
  ratingCount: number | null | undefined,
): string {
  const n = typeof ratingCount === "number" ? ratingCount : 0;
  if (n === 0) return "No ratings yet";
  if (n === 1) return "1 rating";
  return `${n} ratings`;
}
