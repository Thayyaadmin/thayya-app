import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatWorkshopDate, formatWorkshopPrice } from "@/lib/workshop-display";
import type { DiscoverWorkshopRow } from "@/lib/discover-data";
import { workshopPublicPath } from "@/lib/workshop-path";

export type WorkshopDiscoverRowProps = {
  workshop: DiscoverWorkshopRow;
  index: number;
};

export function WorkshopDiscoverRow({ workshop, index }: WorkshopDiscoverRowProps) {
  const avClass = (index % 4) + 1;
  const title = workshop.title || "Untitled workshop";
  const initial = (title || "W").slice(0, 1).toUpperCase();
  const instructorLine =
    workshop.instructor_profile?.full_name ||
    workshop.instructor ||
    workshop.instructor_name ||
    "Instructor TBA";
  const tags = Array.isArray(workshop.tags)
    ? workshop.tags.map((t) => String(t).trim()).filter(Boolean)
    : [];

  return (
    <Link
      href={workshop.id ? workshopPublicPath(workshop) : "/member/discover"}
      className="lift flex w-full items-center gap-4 rounded-2xl p-4 text-left"
      style={{ background: "white", border: "1px solid var(--line)" }}
    >
      <div
        className={`av-${avClass} flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white`}
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-base font-bold md:text-lg">{title}</div>
        <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
          {instructorLine} · {formatWorkshopDate(workshop.date)}
        </div>
        {tags.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                style={{ background: "var(--bg-warm)", color: "var(--ink-soft)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="text-right">
        <div className="font-display text-base font-bold gradient-text md:text-lg">
          {formatWorkshopPrice(workshop.price)}
        </div>
      </div>
      <ChevronRight className="hidden h-4 w-4 shrink-0 md:block" style={{ color: "var(--ink-muted)" }} />
    </Link>
  );
}
