"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  readStoredViewerLocation,
  writeStoredViewerLocation,
  type StoredViewerLocation,
} from "@/lib/member-viewer-location-storage";
import { reverseGeocodeViewerLabel } from "@/lib/viewer-location-geocode";
import { VIEWER_AREA_PRESETS } from "@/lib/viewer-area-presets";
import { ViewerLocationPickerContent } from "@/components/site/elements/viewer-location-picker-content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export { VIEWER_AREA_PRESETS as MEMBER_AREA_PRESETS };

const GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 12_000,
  maximumAge: 300_000,
};

export type MemberViewerLocationContextValue = {
  /** True after first client read of localStorage */
  hydrated: boolean;
  location: StoredViewerLocation | null;
  /** Full right-hand tagline for the site header */
  headerTaglineRight: string;
  openPicker: () => void;
};

const MemberViewerLocationContext = createContext<MemberViewerLocationContextValue | null>(null);

export function useMemberViewerLocation(): MemberViewerLocationContextValue {
  const ctx = useContext(MemberViewerLocationContext);
  if (!ctx) {
    return {
      hydrated: true,
      location: null,
      headerTaglineRight: "Dance fitness · India",
      openPicker: () => {},
    };
  }
  return ctx;
}

type ProviderProps = {
  children: ReactNode;
};

export function MemberViewerLocationProvider({ children }: ProviderProps) {
  const [hydrated, setHydrated] = useState(false);
  const [location, setLocation] = useState<StoredViewerLocation | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const geoEpochRef = useRef(0);
  const locationRef = useRef<StoredViewerLocation | null>(null);
  const prevNeedAreaChoiceRef = useRef(false);
  locationRef.current = location;

  /** First visit: show our dialog until a pin exists (not only after geo fails). */
  const needAreaChoice = hydrated && location === null;

  useEffect(() => {
    const stored = readStoredViewerLocation();
    setLocation(stored);
    setHydrated(true);

    if (stored && stored.label === "Near you") {
      const myEpoch = ++geoEpochRef.current;
      void reverseGeocodeViewerLabel(stored.lat, stored.lng).then((label) => {
        if (myEpoch !== geoEpochRef.current) return;
        const upgraded = { ...stored, label };
        setLocation(upgraded);
        writeStoredViewerLocation(upgraded);
      });
    }
  }, []);

  const persist = useCallback((loc: StoredViewerLocation | null) => {
    setLocation(loc);
    writeStoredViewerLocation(loc);
  }, []);

  const saveDeviceLocation = useCallback(
    async (lat: number, lng: number, epoch: number) => {
      const label = await reverseGeocodeViewerLabel(lat, lng);
      if (epoch !== geoEpochRef.current) return;
      persist({ lat, lng, label });
      setPickerOpen(false);
    },
    [persist],
  );

  const tryGeolocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    const myEpoch = ++geoEpochRef.current;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        void saveDeviceLocation(lat, lng, myEpoch);
      },
      () => {
        /* no-op: user can pick a city in the dialog */
      },
      GEO_OPTIONS,
    );
  }, [saveDeviceLocation]);

  /** When the visitor first needs an area (or re-enters after clearing), try device location once. */
  useEffect(() => {
    const entered = needAreaChoice && !prevNeedAreaChoiceRef.current;
    prevNeedAreaChoiceRef.current = needAreaChoice;
    if (entered) tryGeolocation();
  }, [needAreaChoice, tryGeolocation]);

  const selectLocation = useCallback(
    (loc: StoredViewerLocation) => {
      geoEpochRef.current += 1;
      persist(loc);
      setPickerOpen(false);
    },
    [persist],
  );

  const openPicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const headerTaglineRight = useMemo(() => {
    if (!hydrated) return "Dance fitness · …";
    if (location) return `Dance fitness · ${location.label}`;
    return "Dance fitness · Choose area";
  }, [hydrated, location]);

  const value = useMemo<MemberViewerLocationContextValue>(
    () => ({
      hydrated,
      location,
      headerTaglineRight,
      openPicker,
    }),
    [hydrated, location, headerTaglineRight, openPicker],
  );

  return (
    <MemberViewerLocationContext.Provider value={value}>
      {children}
      <Dialog open={needAreaChoice}>
        <DialogContent
          className="sm:max-w-md [&>button.absolute]:hidden"
          onPointerDownOutside={(e) => {
            if (locationRef.current === null) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (locationRef.current === null) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>Where are you browsing from?</DialogTitle>
            <DialogDescription>
              We use this to show instructors within about 20 km of their studio. Your browser may
              ask for location permission, pick a city below, or search for another area in India.
            </DialogDescription>
          </DialogHeader>
          <ViewerLocationPickerContent
            onSelectLocation={selectLocation}
            onUseDeviceLocation={tryGeolocation}
            showGpsHint
            deviceLocationLabel="Use my device location"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your area</DialogTitle>
            <DialogDescription>
              Update where you&apos;re browsing from. Pick a preset, use GPS, or search for a city
              or neighbourhood.
            </DialogDescription>
          </DialogHeader>
          <ViewerLocationPickerContent
            onSelectLocation={selectLocation}
            onUseDeviceLocation={tryGeolocation}
          />
        </DialogContent>
      </Dialog>
    </MemberViewerLocationContext.Provider>
  );
}
