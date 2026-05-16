import type { AdminInstructorDetail } from "@/lib/admin-instructors";
import type { PrimaryLocationPayload } from "@/lib/primary-location";

/** Build form payload from admin instructor detail API row. */
export function primaryLocationFromInstructor(
  row: Pick<
    AdminInstructorDetail,
    "primary_location" | "address_line" | "city" | "state" | "country"
  >,
): PrimaryLocationPayload | null {
  if (!row.primary_location) return null;
  const city = row.city?.trim() ?? "";
  const country = row.country?.trim() ?? "";
  if (!city || !country) return null;

  const parts = [row.address_line, city, row.state, country].filter(Boolean);
  return {
    primary_location: row.primary_location,
    city,
    country,
    address_line: row.address_line,
    state: row.state,
    venue_name: null,
    formattedLabel: parts.join(", ") || `${city}, ${country}`,
  };
}
