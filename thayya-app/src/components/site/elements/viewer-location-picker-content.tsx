"use client";

import type { StoredViewerLocation } from "@/lib/member-viewer-location-storage";
import { VIEWER_AREA_PRESETS } from "@/lib/viewer-area-presets";
import { ViewerLocationSearchField } from "@/components/site/elements/viewer-location-search-field";

const hasGoogleMapsKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());

export type ViewerLocationPickerContentProps = {
  onSelectLocation: (location: StoredViewerLocation) => void;
  onUseDeviceLocation: () => void;
  /** Extra copy shown on the first-visit dialog only */
  showGpsHint?: boolean;
  deviceLocationLabel?: string;
};

export function ViewerLocationPickerContent({
  onSelectLocation,
  onUseDeviceLocation,
  showGpsHint = false,
  deviceLocationLabel = "Use device location",
}: ViewerLocationPickerContentProps) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted"
        onClick={onUseDeviceLocation}
      >
        {deviceLocationLabel}
      </button>

      {VIEWER_AREA_PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted"
          onClick={() => onSelectLocation({ lat: p.lat, lng: p.lng, label: p.label })}
        >
          {p.label}
        </button>
      ))}

      <div className="mt-1 border-t border-border pt-3">
        <p className="text-muted-foreground mb-2 text-xs leading-relaxed">
          Or search for another city or neighbourhood in India
        </p>
        {hasGoogleMapsKey ? (
          <ViewerLocationSearchField onSelect={onSelectLocation} />
        ) : (
          <p className="text-muted-foreground text-xs leading-relaxed">
            Location search is unavailable (maps API key not configured).
          </p>
        )}
      </div>

      {showGpsHint ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          If you don&apos;t see a browser permission prompt, check the address bar (lock / location
          icon) or site settings — blocked sites won&apos;t get GPS.
        </p>
      ) : null}
    </div>
  );
}
