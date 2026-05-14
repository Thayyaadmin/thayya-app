import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";
import { WorkshopDiscoverRow } from "@/components/site/molecules/WorkshopDiscoverRow";
import type { DiscoverWorkshopRow } from "@/lib/discover-data";

type DiscoverWorkshopsSectionProps = {
  workshops: DiscoverWorkshopRow[];
  error: string | null;
};

export function DiscoverWorkshopsSection({ workshops, error }: DiscoverWorkshopsSectionProps) {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <SiteEyebrow className="mb-1">Open spots</SiteEyebrow>
          <h2 className="font-display text-2xl font-bold md:text-3xl">Workshops this week</h2>
        </div>
      </div>
      {error ? (
        <p className="mb-3 text-sm" style={{ color: "var(--t-red)" }}>
          Could not load live workshops: {error}
        </p>
      ) : null}
      <div className="space-y-3">
        {!error && workshops.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            No workshops available right now.
          </p>
        ) : null}
        {workshops.length > 0
          ? workshops.map((ws, i) => (
              <WorkshopDiscoverRow key={ws.id || String(i)} workshop={ws} index={i} />
            ))
          : null}
      </div>
    </div>
  );
}
