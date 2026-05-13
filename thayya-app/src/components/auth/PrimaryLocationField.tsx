"use client";

import { useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { parseGooglePlaceResult, type GooglePlaceLike, type PrimaryLocationPayload } from "@/lib/primary-location";

export type { PrimaryLocationPayload };

type PrimaryLocationFieldProps = {
  onChange: (payload: PrimaryLocationPayload | null) => void;
  disabled?: boolean;
};

type PlacesAutocompleteCtor = new (
  input: HTMLInputElement,
  opts?: { fields?: string[]; componentRestrictions?: { country: string | string[] } },
) => {
  addListener: (ev: string, fn: () => void) => void;
  getPlace: () => unknown;
};

type PlacesLibraryLike = {
  Autocomplete: PlacesAutocompleteCtor;
};

let mapsLoaderConfigured = false;

function ensureMapsOptions() {
  if (mapsLoaderConfigured) return;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.");
  }
  setOptions({ key, v: "weekly" });
  mapsLoaderConfigured = true;
}

/**
 * Google Places Autocomplete for instructor primary operating location.
 */
export function PrimaryLocationField({ onChange, disabled }: PrimaryLocationFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  /** Google `Autocomplete` instance — typed loosely so we do not require global `google` types at compile time. */
  const acRef = useRef<{ addListener: (name: string, fn: () => void) => void; getPlace: () => unknown } | null>(
    null,
  );
  const onChangeRef = useRef(onChange);
  const selectedLabelRef = useRef<string | null>(null);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (disabled) return;

    let cancelled = false;
    const inputEl = inputRef.current;
    if (!inputEl) return;

    const handleInput = () => {
      const v = inputEl.value.trim();
      if (!v) {
        selectedLabelRef.current = null;
        onChangeRef.current(null);
        return;
      }
      if (selectedLabelRef.current !== null && inputEl.value !== selectedLabelRef.current) {
        selectedLabelRef.current = null;
        onChangeRef.current(null);
      }
    };
    inputEl.addEventListener("input", handleInput);

    async function setup() {
      try {
        ensureMapsOptions();
        const placesLib = (await importLibrary("places")) as PlacesLibraryLike;
        if (cancelled || !inputRef.current) return;

        const AutocompleteCtor = placesLib.Autocomplete;
        const ac = new AutocompleteCtor(inputRef.current, {
          fields: ["geometry", "address_components", "formatted_address", "name"],
          componentRestrictions: { country: "in" },
        });
        acRef.current = ac;

        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const parsed = parseGooglePlaceResult(place as GooglePlaceLike);
          if (parsed) {
            selectedLabelRef.current = parsed.formattedLabel;
            onChangeRef.current(parsed);
          } else {
            selectedLabelRef.current = null;
            onChangeRef.current(null);
          }
        });
      } catch (e) {
        console.error("[PrimaryLocationField] Failed to load Google Maps:", e);
        onChangeRef.current(null);
      }
    }

    void setup();

    return () => {
      cancelled = true;
      inputEl.removeEventListener("input", handleInput);
      const ac = acRef.current;
      acRef.current = null;
      const w = typeof window !== "undefined" ? (window as unknown as { google?: { maps?: { event?: { clearInstanceListeners: (x: unknown) => void } } } }) : null;
      const evt = w?.google?.maps?.event;
      if (ac && evt) {
        evt.clearInstanceListeners(ac);
      }
    };
  }, [disabled]);

  return (
    <div className="space-y-2">
      <label htmlFor="primaryLocation" className="text-sm font-medium text-foreground">
        Primary location of operation
      </label>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Search for your studio or main teaching area. We use this to show you on the map. (India
        addresses.)
      </p>
      <input
        ref={inputRef}
        id="primaryLocation"
        type="text"
        autoComplete="off"
        disabled={disabled}
        placeholder="Start typing an address or place name…"
        className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-60"
      />
    </div>
  );
}
