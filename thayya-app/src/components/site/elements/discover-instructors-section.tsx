import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";
import { InstructorDiscoverCard } from "@/components/site/molecules/InstructorDiscoverCard";
import type { DiscoverInstructorRow } from "@/lib/discover-data";

type DiscoverInstructorsSectionProps = {
  instructors: DiscoverInstructorRow[];
  error: string | null;
};

export function DiscoverInstructorsSection({ instructors, error }: DiscoverInstructorsSectionProps) {
  return (
    <div className="mb-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <SiteEyebrow className="mb-1">Featured · This month</SiteEyebrow>
          <h2 className="font-display text-2xl font-bold md:text-3xl">Instructors near you</h2>
        </div>
      </div>
      {error ? (
        <p className="mb-3 text-sm" style={{ color: "var(--t-red)" }}>
          Could not load instructors: {error}
        </p>
      ) : instructors.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
          No instructors are on Thayya yet. Sign up as an instructor to be the first.
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
