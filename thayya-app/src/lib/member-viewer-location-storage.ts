export const MEMBER_VIEWER_LOCATION_KEY = "thayya_member_viewer_location_v1";

export type StoredViewerLocation = {
  lat: number;
  lng: number;
  /** Short label for header, e.g. "Bangalore" or "Near you" */
  label: string;
};

export function readStoredViewerLocation(): StoredViewerLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MEMBER_VIEWER_LOCATION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<StoredViewerLocation>;
    if (
      typeof o.lat !== "number" ||
      typeof o.lng !== "number" ||
      typeof o.label !== "string" ||
      !Number.isFinite(o.lat) ||
      !Number.isFinite(o.lng) ||
      o.lat < -90 ||
      o.lat > 90 ||
      o.lng < -180 ||
      o.lng > 180
    ) {
      return null;
    }
    return { lat: o.lat, lng: o.lng, label: o.label.trim() || "Saved area" };
  } catch {
    return null;
  }
}

export function writeStoredViewerLocation(loc: StoredViewerLocation | null): void {
  if (typeof window === "undefined") return;
  try {
    if (loc === null) {
      window.localStorage.removeItem(MEMBER_VIEWER_LOCATION_KEY);
    } else {
      window.localStorage.setItem(MEMBER_VIEWER_LOCATION_KEY, JSON.stringify(loc));
    }
  } catch {
    /* quota / private mode */
  }
}
