/** Workshop has not started yet (undated workshops are treated as upcoming). */
export function isWorkshopUpcoming(dateValue: string | null, nowMs = Date.now()): boolean {
  if (dateValue == null || dateValue === "") return true;
  const when = new Date(dateValue);
  const ms = when.getTime();
  if (!Number.isFinite(ms)) return true;
  return ms >= nowMs;
}
