import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import {
  addressPartsFromComponents,
  type GoogleAddressComponent,
} from "@/lib/primary-location";
import { VIEWER_AREA_PRESETS } from "@/lib/viewer-area-presets";

let mapsLoaderConfigured = false;

function ensureMapsOptions(): boolean {
  if (mapsLoaderConfigured) return true;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return false;
  setOptions({ key, v: "weekly" });
  mapsLoaderConfigured = true;
  return true;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestPresetLabel(lat: number, lng: number): string | null {
  let best: { label: string; km: number } | null = null;
  for (const p of VIEWER_AREA_PRESETS) {
    const km = distanceKm(lat, lng, p.lat, p.lng);
    if (km <= 45 && (!best || km < best.km)) {
      best = { label: p.label, km };
    }
  }
  return best?.label ?? null;
}

function labelFromAddressComponents(components: GoogleAddressComponent[]): string | null {
  const { city, state } = addressPartsFromComponents(components);
  const trimmedCity = city.trim();
  if (!trimmedCity) return null;
  const trimmedState = state?.trim();
  if (trimmedState && trimmedState !== trimmedCity) {
    return `${trimmedCity}, ${trimmedState}`;
  }
  return trimmedCity;
}

/** Resolve a short place name (city) for header / discover from lat/lng. */
export async function reverseGeocodeViewerLabel(lat: number, lng: number): Promise<string> {
  if (ensureMapsOptions()) {
    try {
      const { Geocoder } = await importLibrary("geocoding");
      const geocoder = new Geocoder();
      const { results } = await geocoder.geocode({ location: { lat, lng } });
      for (const result of results ?? []) {
        const components = result.address_components as GoogleAddressComponent[] | undefined;
        if (!components?.length) continue;
        const label = labelFromAddressComponents(components);
        if (label) return label;
      }
    } catch {
      /* fall through to preset / generic label */
    }
  }

  return nearestPresetLabel(lat, lng) ?? "Your area";
}
