"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/instructor/today", label: "Today" },
  { href: "/instructor/library", label: "Content Library" },
  { href: "/instructor/workshops", label: "My Workshops" },
  { href: "/instructor/students", label: "My Students" },
  { href: "/instructor/earnings", label: "Earnings" },
  { href: "/instructor/public", label: "Public Page" },
] as const;

export function InstructorSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-[73px] z-30 border-b"
      style={{ background: "var(--bg)", borderColor: "var(--line)" }}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 md:px-6">
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max gap-1 py-2">
            {links.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    isActive ? "bg-[var(--ink)] text-white" : "text-[var(--ink-soft)] hover:text-black"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <Link
          href="/dashboard"
          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap md:text-sm"
          style={{ background: "white", border: "1px solid var(--line)", color: "var(--ink)" }}
        >
          Manage workshops
        </Link>
      </div>
    </nav>
  );
}
