import {
  addressPartsFromComponents,
  parseGooglePlaceResult,
  type GoogleAddressComponent,
  type GooglePlaceLike,
} from "@/lib/primary-location";
import type { StoredViewerLocation } from "@/lib/member-viewer-location-storage";

/** Build viewer browsing pin + short header label from a Google Place details result. */
export function placeToStoredViewerLocation(
  place: GooglePlaceLike | null | undefined,
): StoredViewerLocation | null {
  const parsed = parseGooglePlaceResult(place);
  if (parsed) {
    const [lng, lat] = parsed.primary_location.coordinates;
    const label = parsed.city.trim() || parsed.formattedLabel;
    return { lat, lng, label };
  }

  const loc = place?.geometry?.location;
  if (!loc) return null;
  const lat = loc.lat();
  const lng = loc.lng();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const components = (place?.address_components ?? []) as GoogleAddressComponent[];
  const { city } = addressPartsFromComponents(components);
  const label =
    city.trim() ||
    place?.name?.trim() ||
    place?.formatted_address?.split(",")[0]?.trim() ||
    "Your area";

  return { lat, lng, label };
}
