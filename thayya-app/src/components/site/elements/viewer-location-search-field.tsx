"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import type { StoredViewerLocation } from "@/lib/member-viewer-location-storage";
import { placeToStoredViewerLocation } from "@/lib/viewer-location-from-place";
import type { GooglePlaceLike } from "@/lib/primary-location";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

type AutocompletionRequestLike = {
  input: string;
  componentRestrictions?: { country: string | string[] };
  sessionToken?: object;
};

type AutocompletePredictionLike = {
  place_id: string;
  description: string;
};

type AutocompleteServiceLike = {
  getPlacePredictions: (
    request: AutocompletionRequestLike,
    callback: (predictions: AutocompletePredictionLike[] | null, status: string) => void,
  ) => void;
};

type PlaceDetailsRequestLike = {
  placeId: string;
  fields?: string[];
  sessionToken?: object;
};

type PlacesServiceLike = {
  getDetails: (
    request: PlaceDetailsRequestLike,
    callback: (place: unknown, status: string) => void,
  ) => void;
};

type PlacesLibraryLike = {
  AutocompleteService: new () => AutocompleteServiceLike;
  PlacesService: new (attr: HTMLDivElement) => PlacesServiceLike;
  AutocompleteSessionToken: new () => object;
};

let mapsLoaderConfigured = false;

function ensureMapsOptions(): boolean {
  if (mapsLoaderConfigured) return true;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return false;
  setOptions({ key, v: "weekly" });
  mapsLoaderConfigured = true;
  return true;
}

const PLACE_FIELDS: string[] = ["geometry", "address_components", "formatted_address", "name"];
const DEBOUNCE_MS = 280;

export type ViewerLocationSearchFieldProps = {
  onSelect: (location: StoredViewerLocation) => void;
  disabled?: boolean;
  inputId?: string;
};

export function ViewerLocationSearchField({
  onSelect,
  disabled,
  inputId = "viewerLocationSearch",
}: ViewerLocationSearchFieldProps) {
  const listboxId = useId();
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const queryRef = useRef("");
  const onSelectRef = useRef(onSelect);
  const selectedLabelRef = useRef<string | null>(null);
  const sessionTokenRef = useRef<object | null>(null);
  const placesLibRef = useRef<PlacesLibraryLike | null>(null);
  const acServiceRef = useRef<AutocompleteServiceLike | null>(null);
  const placesServiceRef = useRef<PlacesServiceLike | null>(null);
  const attrDivRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchGenRef = useRef(0);

  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<AutocompletePredictionLike[]>([]);
  const [loading, setLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);

  useLayoutEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const open = Boolean(!disabled && mapsReady && query.trim() && (loading || predictions.length > 0));

  const runPredictions = useCallback(
    (text: string) => {
      const ac = acServiceRef.current;
      if (!ac || disabled) return;

      const gen = ++fetchGenRef.current;
      const trimmed = text.trim();
      if (!trimmed) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      const lib = placesLibRef.current;
      if (!sessionTokenRef.current && lib) {
        sessionTokenRef.current = new lib.AutocompleteSessionToken();
      }

      setPredictions([]);
      setLoading(true);
      ac.getPlacePredictions(
        {
          input: trimmed,
          componentRestrictions: { country: "in" },
          sessionToken: sessionTokenRef.current ?? undefined,
        },
        (results, status) => {
          if (fetchGenRef.current !== gen) return;
          setLoading(false);
          if (status !== "OK" || !results) {
            setPredictions([]);
            return;
          }
          setPredictions(results);
        },
      );
    },
    [disabled],
  );

  useEffect(() => {
    if (disabled) return;

    let cancelled = false;

    async function setup() {
      if (!ensureMapsOptions()) return;
      try {
        if (!attrDivRef.current) {
          attrDivRef.current = document.createElement("div");
        }
        const placesLib = (await importLibrary("places")) as PlacesLibraryLike;
        if (cancelled) return;

        placesLibRef.current = placesLib;
        acServiceRef.current = new placesLib.AutocompleteService();
        placesServiceRef.current = new placesLib.PlacesService(attrDivRef.current);
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        setMapsReady(true);

        const pending = queryRef.current.trim();
        if (pending) runPredictions(pending);
      } catch (e) {
        console.error("[ViewerLocationSearchField] Failed to load Google Maps:", e);
      }
    }

    void setup();

    return () => {
      cancelled = true;
      placesLibRef.current = null;
      acServiceRef.current = null;
      placesServiceRef.current = null;
      sessionTokenRef.current = null;
    };
  }, [disabled, runPredictions]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (disabled || !mapsReady) return;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        setPredictions([]);
        setLoading(false);
        selectedLabelRef.current = null;
        return;
      }

      if (selectedLabelRef.current !== null && value !== selectedLabelRef.current) {
        selectedLabelRef.current = null;
      }

      debounceRef.current = setTimeout(() => runPredictions(value), DEBOUNCE_MS);
    },
    [disabled, mapsReady, runPredictions],
  );

  const handlePick = (placeId: string) => {
    const ps = placesServiceRef.current;
    if (!ps) return;

    fetchGenRef.current += 1;
    setLoading(true);
    ps.getDetails(
      {
        placeId,
        fields: PLACE_FIELDS,
        sessionToken: sessionTokenRef.current ?? undefined,
      },
      (place, status) => {
        setLoading(false);
        setPredictions([]);

        if (status !== "OK" || !place) return;

        const stored = placeToStoredViewerLocation(place as GooglePlaceLike);
        if (stored) {
          selectedLabelRef.current = stored.label;
          setQuery(stored.label);
          onSelectRef.current(stored);
        }

        const lib = placesLibRef.current;
        if (lib) sessionTokenRef.current = new lib.AutocompleteSessionToken();
      },
    );
  };

  return (
    <div
      ref={(el) => {
        setPortalContainer((prev) => (prev === el ? prev : el));
      }}
      className="relative"
    >
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            fetchGenRef.current += 1;
            setPredictions([]);
            setLoading(false);
          }
        }}
        modal={false}
      >
        <PopoverAnchor asChild>
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            disabled={disabled || !mapsReady}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={mapsReady ? "Search city or area in India…" : "Loading search…"}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-autocomplete="list"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </PopoverAnchor>

        <PopoverContent
          portalContainer={portalContainer}
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={8}
          className="z-[100] max-h-64 w-(--radix-popper-anchor-width) min-w-0 overflow-hidden p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <ul id={listboxId} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {loading && predictions.length === 0 ? (
              <li className="px-2 py-2 text-sm text-muted-foreground">Searching…</li>
            ) : null}
            {predictions.map((p) => (
              <li key={p.place_id} role="none">
                <button
                  type="button"
                  role="option"
                  className="relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(p.place_id)}
                >
                  <span className="line-clamp-2">{p.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
