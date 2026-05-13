"use client";

import { useEffect, useState } from "react";
import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";
import { InstructorDiscoverCard } from "@/components/site/molecules/InstructorDiscoverCard";
import type { DiscoverInstructorRow } from "@/lib/discover-data";
import { fetchDiscoverInstructorsBrowser } from "@/lib/discover-instructors-browser";
import { useMemberViewerLocation } from "@/contexts/member-viewer-location-context";

export function DiscoverInstructorsMemberClient() {
  const { location, hydrated, isMember } = useMemberViewerLocation();
  const [instructors, setInstructors] = useState<DiscoverInstructorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isMember) return;
    let cancelled = false;

    async function load() {
      if (!hydrated) return;
      if (!location) {
        if (!cancelled) {
          setInstructors([]);
          setError(null);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setLoading(true);
      const res = await fetchDiscoverInstructorsBrowser(location.lat, location.lng);
      if (cancelled) return;
      setInstructors(res.data);
      setError(res.error);
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isMember, hydrated, location]);

  if (!hydrated) {
    return (
      <div className="mb-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <SiteEyebrow className="mb-1">Near you</SiteEyebrow>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Instructors near you</h2>
          </div>
        </div>
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Preparing your area…
        </p>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="mb-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <SiteEyebrow className="mb-1">Your area</SiteEyebrow>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Instructors near you</h2>
          </div>
        </div>
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Confirm your city or use your device location (see the dialog). You can also tap your
          location in the header to change it later.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mb-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <SiteEyebrow className="mb-1">Near you</SiteEyebrow>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Instructors near you</h2>
          </div>
        </div>
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          Loading instructors…
        </p>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <SiteEyebrow className="mb-1">Within ~20 km · {location.label}</SiteEyebrow>
          <h2 className="font-display text-2xl font-bold md:text-3xl">Instructors near you</h2>
        </div>
      </div>
      {error ? (
        <p className="mb-3 text-sm" style={{ color: "var(--t-red)" }}>
          Could not load instructors: {error}
        </p>
      ) : instructors.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          No instructors with a listed studio in this radius yet. Try another area from the header.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {instructors.map((inst) => (
            <InstructorDiscoverCard
              key={inst.id}
              id={inst.id}
              fullName={inst.full_name}
              slug={inst.slug}
              bio={inst.bio}
            />
          ))}
        </div>
      )}
    </div>
  );
}
