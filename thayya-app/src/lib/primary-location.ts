/**
 * Payload for `register-user-profile` Edge Function (instructor primary location).
 * GeoJSON Point uses [lng, lat] per PostGIS / RFC 7946.
 */
export type PrimaryLocationPayload = {
  primary_location: { type: "Point"; coordinates: [number, number] };
  city: string;
  country: string;
  address_line: string | null;
  state: string | null;
  /** Human-readable label for the input */
  formattedLabel: string;
};

export type GoogleAddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function firstComponent(components: GoogleAddressComponent[], ...types: string[]): string {
  for (const t of types) {
    const c = components.find((x) => x.types.includes(t));
    if (c?.long_name) return c.long_name.trim();
  }
  return "";
}

/**
 * Derive city / country / state / street line from Places `address_components`.
 */
export function addressPartsFromComponents(components: GoogleAddressComponent[]): {
  city: string;
  country: string;
  state: string | null;
  address_line: string | null;
} {
  const streetNumber = firstComponent(components, "street_number");
  const route = firstComponent(components, "route");
  const street = [streetNumber, route].filter(Boolean).join(" ").trim();

  const city =
    firstComponent(components, "locality") ||
    firstComponent(components, "sublocality", "sublocality_level_1") ||
    firstComponent(components, "postal_town") ||
    firstComponent(components, "administrative_area_level_2");

  const state = firstComponent(components, "administrative_area_level_1") || null;
  const country = firstComponent(components, "country");

  return {
    city,
    country,
    state,
    address_line: street || null,
  };
}

export type GooglePlaceLike = {
  geometry?: { location?: { lat: () => number; lng: () => number } | null } | null;
  address_components?: GoogleAddressComponent[] | null;
  formatted_address?: string | null;
  name?: string | null;
};

export function parseGooglePlaceResult(place: GooglePlaceLike | null | undefined): PrimaryLocationPayload | null {
  if (!place?.geometry?.location) return null;
  const loc = place.geometry.location;
  const lat = loc.lat();
  const lng = loc.lng();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const components = place.address_components ?? [];
  const { city, country, state, address_line } = addressPartsFromComponents(components);
  if (!city.trim() || !country.trim()) return null;

  const formattedLabel =
    (place.formatted_address && place.formatted_address.trim()) ||
    (place.name && place.name.trim()) ||
    [city, country].filter(Boolean).join(", ");

  return {
    primary_location: { type: "Point", coordinates: [lng, lat] },
    city: city.trim(),
    country: country.trim(),
    address_line,
    state,
    formattedLabel,
  };
}
