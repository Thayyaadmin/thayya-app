"use client";

import { Star } from "lucide-react";

type StarRatingProps = {
  value: number;
  max?: number;
  size?: "sm" | "md";
  /** When set, stars are clickable for input. */
  onChange?: (value: number) => void;
  className?: string;
};

const sizeClasses = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
} as const;

export function StarRating({
  value,
  max = 5,
  size = "md",
  onChange,
  className = "",
}: StarRatingProps) {
  const interactive = typeof onChange === "function";
  const iconClass = sizeClasses[size];

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${className}`}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? "Rating" : `Rating: ${value} out of ${max}`}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= value;

        if (interactive) {
          return (
            <button
              key={starValue}
              type="button"
              className="rounded p-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
              style={{
                color: filled ? "var(--t-amber, #f59e0b)" : "var(--line)",
              }}
              aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
              aria-checked={starValue === value}
              role="radio"
              onClick={() => onChange(starValue)}
            >
              <Star
                className={iconClass}
                fill={filled ? "currentColor" : "none"}
                strokeWidth={filled ? 0 : 1.75}
              />
            </button>
          );
        }

        return (
          <span
            key={starValue}
            style={{
              color: filled ? "var(--t-amber, #f59e0b)" : "var(--line)",
            }}
          >
            <Star
              className={iconClass}
              fill={filled ? "currentColor" : "none"}
              strokeWidth={filled ? 0 : 1.75}
            />
          </span>
        );
      })}
    </div>
  );
}
