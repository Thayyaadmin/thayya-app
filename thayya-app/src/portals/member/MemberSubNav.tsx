"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/member/discover", label: "Discover" },
  { href: "/member/bookings", label: "My Bookings" },
  { href: "/member/membership", label: "Membership" },
] as const;

export function MemberSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-[73px] z-30 border-b"
      style={{ background: "var(--bg)", borderColor: "var(--line)" }}
    >
      <div className="mx-auto max-w-[1400px] overflow-x-auto px-4 scrollbar-hide md:px-6">
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
    </nav>
  );
}
