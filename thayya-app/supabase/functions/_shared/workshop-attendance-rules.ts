/** Member self check-in: workshop day or later (undated workshops allowed). */
export function canMarkSelfAttendance(dateValue: string | null): boolean {
  if (dateValue == null || dateValue === "") return true;
  const when = new Date(dateValue);
  if (!Number.isFinite(when.getTime())) return true;
  const endToday = new Date();
  endToday.setHours(23, 59, 59, 999);
  return when.getTime() <= endToday.getTime();
}
