import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatWorkshopDate, formatWorkshopPrice } from "@/lib/workshop-display";
import type { DiscoverWorkshopRow } from "@/lib/discover-data";

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

  return (
    <Link
      href="/member/book"
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
