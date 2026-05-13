import type { ReactNode } from "react";

type SiteEyebrowProps = {
  children: ReactNode;
  className?: string;
};

export function SiteEyebrow({ children, className = "" }: SiteEyebrowProps) {
  return (
    <div
      className={`text-[10px] font-semibold tracking-[0.25em] uppercase md:text-[11px] ${className}`}
      style={{ color: "var(--ink-muted)" }}
    >
      {children}
    </div>
  );
}
