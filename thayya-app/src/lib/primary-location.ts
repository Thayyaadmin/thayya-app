/**
 * Payload for profile location fields (member onboarding or admin instructor create).
 * GeoJSON Point uses [lng, lat] per PostGIS / RFC 7946.
 */
export type PrimaryLocationPayload = {
  primary_location: { type: "Point"; coordinates: [number, number] };
  city: string;
  country: string;
  address_line: string | null;
  state: string | null;
  /** Google Places establishment / POI name when present */
  venue_name: string | null;
  /** Human-readable label for the input (prefer place name, else formatted address) */
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
 * Build address line: first `address_components` entry, then sublocality-style segment
 * (sublocality_level_2 → sublocality → sublocality_level_1, or political combined with a local type),
 * then formatted address (deduped segments).
 */
export function buildAddressLineFromComponents(
  components: GoogleAddressComponent[],
  formattedAddress: string | null | undefined,
): string | null {
  const first = components[0]?.long_name?.trim() ?? "";

  let subPol = "";
  for (const typ of ["sublocality_level_2", "sublocality", "sublocality_level_1"] as const) {
    const c = components.find((x) => x.types.includes(typ));
    if (c?.long_name?.trim()) {
      subPol = c.long_name.trim();
      break;
    }
  }
  if (!subPol) {
    const c = components.find(
      (x) =>
        x.types.includes("political") &&
        (x.types.includes("sublocality_level_2") ||
          x.types.includes("sublocality") ||
          x.types.includes("neighborhood") ||
          x.types.includes("premise")),
    );
    if (c?.long_name?.trim()) subPol = c.long_name.trim();
  }

  const formatted = formattedAddress?.trim() ?? "";

  const rawPieces = [first, subPol, formatted].filter(Boolean);
  const deduped: string[] = [];
  for (const p of rawPieces) {
    if (deduped[deduped.length - 1] === p) continue;
    deduped.push(p);
  }

  const line = deduped.join(", ").trim();
  return line.length ? line : null;
}

/**
 * Derive city / country / state from Places `address_components`.
 */
export function addressPartsFromComponents(components: GoogleAddressComponent[]): {
  city: string;
  country: string;
  state: string | null;
} {
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
  const { city, country, state } = addressPartsFromComponents(components);
  if (!city.trim() || !country.trim()) return null;

  const venueNameRaw = place.name?.trim();
  const venue_name = venueNameRaw && venueNameRaw.length > 0 ? venueNameRaw : null;

  const formattedLabel =
    venue_name ||
    (place.formatted_address && place.formatted_address.trim()) ||
    [city, country].filter(Boolean).join(", ");

  const address_line = buildAddressLineFromComponents(components, place.formatted_address ?? null);

  return {
    primary_location: { type: "Point", coordinates: [lng, lat] },
    city: city.trim(),
    country: country.trim(),
    address_line,
    state,
    venue_name,
    formattedLabel,
  };
}
