"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { parseGooglePlaceResult, type GooglePlaceLike, type PrimaryLocationPayload } from "@/lib/primary-location";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

export type { PrimaryLocationPayload };

type PrimaryLocationFieldProps = {
  onChange: (payload: PrimaryLocationPayload | null) => void;
  disabled?: boolean;
  /** Override default instructor signup copy (e.g. workshop venue). */
  label?: string;
  description?: string;
  inputId?: string;
};

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

function ensureMapsOptions() {
  if (mapsLoaderConfigured) return;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.");
  }
  setOptions({ key, v: "weekly" });
  mapsLoaderConfigured = true;
}

const PLACE_FIELDS: string[] = ["geometry", "address_components", "formatted_address", "name"];

const DEBOUNCE_MS = 280;

const DEFAULT_LABEL = "Primary location of operation";
const DEFAULT_DESCRIPTION =
  "Search for your studio or main teaching area. We use this to show you on the map. (India addresses.)";

/**
 * Google Places search with Radix Popover suggestion list (no `.pac-container` widget),
 * so results stay clickable inside modals and match design-system styling.
 */
export function PrimaryLocationField({
  onChange,
  disabled,
  label = DEFAULT_LABEL,
  description = DEFAULT_DESCRIPTION,
  inputId = "primaryLocation",
}: PrimaryLocationFieldProps) {
  const listboxId = useId();
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);
  const queryRef = useRef("");
  const onChangeRef = useRef(onChange);
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

  useLayoutEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const open = Boolean(!disabled && query.trim() && (loading || predictions.length > 0));

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
      try {
        ensureMapsOptions();
        if (!attrDivRef.current) {
          attrDivRef.current = document.createElement("div");
        }
        const placesLib = (await importLibrary("places")) as PlacesLibraryLike;
        if (cancelled) return;

        placesLibRef.current = placesLib;
        acServiceRef.current = new placesLib.AutocompleteService();
        placesServiceRef.current = new placesLib.PlacesService(attrDivRef.current);
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();

        const pending = queryRef.current.trim();
        if (pending) runPredictions(pending);
      } catch (e) {
        console.error("[PrimaryLocationField] Failed to load Google Maps:", e);
        onChangeRef.current(null);
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

  useEffect(() => {
    if (!disabled) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    fetchGenRef.current += 1;
    queueMicrotask(() => {
      setPredictions([]);
      setLoading(false);
    });
  }, [disabled]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (disabled) return;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        setPredictions([]);
        setLoading(false);
        selectedLabelRef.current = null;
        onChangeRef.current(null);
        return;
      }

      if (selectedLabelRef.current !== null && value !== selectedLabelRef.current) {
        selectedLabelRef.current = null;
        onChangeRef.current(null);
      }

      debounceRef.current = setTimeout(() => runPredictions(value), DEBOUNCE_MS);
    },
    [disabled, runPredictions],
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

        if (status !== "OK" || !place) {
          onChangeRef.current(null);
          return;
        }

        const parsed = parseGooglePlaceResult(place as GooglePlaceLike);
        if (parsed) {
          selectedLabelRef.current = parsed.formattedLabel;
          setQuery(parsed.formattedLabel);
          onChangeRef.current(parsed);
        } else {
          selectedLabelRef.current = null;
          onChangeRef.current(null);
        }

        const lib = placesLibRef.current;
        if (lib) sessionTokenRef.current = new lib.AutocompleteSessionToken();
      },
    );
  };

  const handlePopoverOpenChange = (next: boolean) => {
    if (!next) {
      fetchGenRef.current += 1;
      setPredictions([]);
      setLoading(false);
    }
  };

  return (
    <div
      ref={(el) => {
        setPortalContainer((prev) => (prev === el ? prev : el));
      }}
      className="relative space-y-2"
    >
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {description ? (
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      ) : null}

      <Popover open={open} onOpenChange={handlePopoverOpenChange} modal={false}>
        <PopoverAnchor asChild>
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            disabled={disabled}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Start typing an address or place name…"
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-autocomplete="list"
            className="w-full px-4 py-3 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-60"
          />
        </PopoverAnchor>

        <PopoverContent
          portalContainer={portalContainer}
          align="start"
          side="bottom"
          sideOffset={6}
          collisionPadding={8}
          className="max-h-64 w-(--radix-popper-anchor-width) min-w-0 overflow-hidden p-0"
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
                  aria-selected={false}
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
