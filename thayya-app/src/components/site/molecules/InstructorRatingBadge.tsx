import { Star } from "lucide-react";

import {
  formatInstructorRatingAvg,
  formatInstructorRatingCount,
} from "@/lib/instructor-rating-display";

type InstructorRatingBadgeProps = {
  ratingAvg: number | null | undefined;
  ratingCount: number | null | undefined;
  size?: "sm" | "md";
  className?: string;
};

export function InstructorRatingBadge({
  ratingAvg,
  ratingCount,
  size = "sm",
  className = "",
}: InstructorRatingBadgeProps) {
  const count = typeof ratingCount === "number" ? ratingCount : 0;
  if (count === 0) {
    return (
      <span className={`text-xs ${className}`} style={{ color: "var(--ink-muted)" }}>
        {formatInstructorRatingCount(0)}
      </span>
    );
  }

  const avg = formatInstructorRatingAvg(ratingAvg);
  const starSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}
      title={formatInstructorRatingCount(count)}
    >
      <Star
        className={`${starSize} shrink-0`}
        style={{ color: "var(--t-amber, #f59e0b)" }}
        fill="currentColor"
      />
      <span className={size === "md" ? "text-sm font-semibold" : "text-xs font-semibold"}>
        {avg}
      </span>
      <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
        · {formatInstructorRatingCount(count)}
      </span>
    </span>
  );
}
