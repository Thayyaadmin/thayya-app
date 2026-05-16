export type GeoJsonPoint = {
  type: "Point";
  coordinates: [number, number];
};

/** Accept object or JSON string (some clients stringify nested bodies). */
export function unwrapGeoInput(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    try {
      return JSON.parse(t) as unknown;
    } catch {
      return null;
    }
  }
  return raw;
}

export function parseGeoPoint(p: unknown): GeoJsonPoint | null {
  const unwrapped = unwrapGeoInput(p);
  if (unwrapped == null) return null;
  if (typeof unwrapped !== "object" || unwrapped === null) return null;
  const o = unwrapped as Record<string, unknown>;
  if (o.type !== "Point" || !Array.isArray(o.coordinates)) return null;
  const c = o.coordinates as unknown[];
  if (c.length < 2) return null;
  const lng = Number(c[0]);
  const lat = Number(c[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { type: "Point", coordinates: [lng, lat] };
}

/** PostgREST + `geography(Point,4326)` reliably accepts EWKT; raw GeoJSON often triggers "invalid geometry". */
export function pointToEwkt(geo: GeoJsonPoint): string {
  const [lng, lat] = geo.coordinates;
  return `SRID=4326;POINT(${lng} ${lat})`;
}
