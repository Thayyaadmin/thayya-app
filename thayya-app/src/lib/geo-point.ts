/**
 * Parse PostGIS / GeoJSON-style point values returned from Supabase for `geography(Point)`.
 */
export function coordsFromPoint(value: unknown): { lat: number; lng: number } | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const m = /^SRID=\d+;POINT\(([-.0-9eE+]+)\s+([-.0-9eE+]+)\)$/i.exec(value.trim());
    if (m) {
      const lng = Number(m[1]);
      const lat = Number(m[2]);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }
    return null;
  }
  if (typeof value === "object" && value !== null) {
    const o = value as { type?: string; coordinates?: unknown[] };
    if (o.type === "Point" && Array.isArray(o.coordinates) && o.coordinates.length >= 2) {
      const lng = Number(o.coordinates[0]);
      const lat = Number(o.coordinates[1]);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    }
  }
  return null;
}

export function toGeoJsonPoint(value: unknown): { type: "Point"; coordinates: [number, number] } | null {
  const c = coordsFromPoint(value);
  if (!c) return null;
  return { type: "Point", coordinates: [c.lng, c.lat] };
}
