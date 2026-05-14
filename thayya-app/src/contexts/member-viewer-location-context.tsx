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
import type { UserType } from "@/lib/profile";
import {
  readStoredViewerLocation,
  writeStoredViewerLocation,
  type StoredViewerLocation,
} from "@/lib/member-viewer-location-storage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const MEMBER_AREA_PRESETS = [
  { label: "Coimbatore", lat: 11.0141262, lng: 76.8846626 },
  { label: "Bangalore", lat: 12.9881312, lng: 77.5393993 },
] as const;

const GEO_LABEL = "Near you";

const GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 12_000,
  maximumAge: 300_000,
};

export type MemberViewerLocationContextValue = {
  isMember: boolean;
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
      isMember: false,
      hydrated: true,
      location: null,
      headerTaglineRight: "Dance fitness · India",
      openPicker: () => {},
    };
  }
  return ctx;
}

type ProviderProps = {
  userType: UserType | null;
  isAuthenticated: boolean;
  children: ReactNode;
};

export function MemberViewerLocationProvider({
  userType,
  isAuthenticated,
  children,
}: ProviderProps) {
  const isMember = isAuthenticated && userType === "member";
  const [hydrated, setHydrated] = useState(false);
  const [location, setLocation] = useState<StoredViewerLocation | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const geoEpochRef = useRef(0);
  const locationRef = useRef<StoredViewerLocation | null>(null);
  const prevNeedAreaChoiceRef = useRef(false);
  locationRef.current = location;

  /** First visit: show our dialog until a pin exists (not only after geo fails). */
  const needAreaChoice = isMember && hydrated && location === null;

  useEffect(() => {
    if (!isMember) {
      setHydrated(true);
      return;
    }
    const stored = readStoredViewerLocation();
    setLocation(stored);
    setHydrated(true);
  }, [isMember]);

  const persist = useCallback((loc: StoredViewerLocation | null) => {
    setLocation(loc);
    writeStoredViewerLocation(loc);
  }, []);

  const tryGeolocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }
    const myEpoch = ++geoEpochRef.current;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (myEpoch !== geoEpochRef.current) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        persist({ lat, lng, label: GEO_LABEL });
        setPickerOpen(false);
      },
      () => {
        /* no-op: user can pick a city in the dialog */
      },
      GEO_OPTIONS,
    );
  }, [persist]);

  /** When the member first needs an area (or re-enters after clearing), try device location once. */
  useEffect(() => {
    const entered = needAreaChoice && !prevNeedAreaChoiceRef.current;
    prevNeedAreaChoiceRef.current = needAreaChoice;
    if (entered) tryGeolocation();
  }, [needAreaChoice, tryGeolocation]);

  const applyPreset = useCallback(
    (lat: number, lng: number, label: string) => {
      geoEpochRef.current += 1;
      persist({ lat, lng, label });
      setPickerOpen(false);
    },
    [persist],
  );

  const openPicker = useCallback(() => {
    if (!isMember) return;
    setPickerOpen(true);
  }, [isMember]);

  const headerTaglineRight = useMemo(() => {
    if (!isMember) return "Dance fitness · India";
    if (!hydrated) return "Dance fitness · …";
    if (location) return `Dance fitness · ${location.label}`;
    return "Dance fitness · Choose area";
  }, [isMember, hydrated, location]);

  const value = useMemo<MemberViewerLocationContextValue>(
    () => ({
      isMember,
      hydrated,
      location,
      headerTaglineRight,
      openPicker,
    }),
    [isMember, hydrated, location, headerTaglineRight, openPicker],
  );

  return (
    <MemberViewerLocationContext.Provider value={value}>
      {children}
      {isMember ? (
        <>
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
                  We use this to show instructors within about 20 km of their studio. Your browser
                  may ask for location permission — you can also pick a city below. (India only for
                  now.)
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted"
                  onClick={() => tryGeolocation()}
                >
                  Use my device location ({GEO_LABEL})
                </button>
                {MEMBER_AREA_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted"
                    onClick={() => applyPreset(p.lat, p.lng, p.label)}
                  >
                    {p.label}
                  </button>
                ))}
                <p className="text-muted-foreground text-xs leading-relaxed">
                  If you don&apos;t see a browser permission prompt, check the address bar (lock /
                  location icon) or site settings — blocked sites won&apos;t get GPS.
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Your area</DialogTitle>
                <DialogDescription>
                  Update where you&apos;re browsing from. We use this to rank nearby instructors.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted"
                  onClick={() => {
                    tryGeolocation();
                  }}
                >
                  Use device location ({GEO_LABEL})
                </button>
                {MEMBER_AREA_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted"
                    onClick={() => applyPreset(p.lat, p.lng, p.label)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </MemberViewerLocationContext.Provider>
  );
}
