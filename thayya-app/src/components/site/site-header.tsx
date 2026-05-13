"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";
import type { PortalId } from "@/lib/site-portals";
import { portalHomeHref, portalLabel } from "@/lib/site-portals";
import { supabase } from "@/app/supabaseClient";

export type SiteHeaderProps = {
  allowedPortals: PortalId[];
  userEmail: string | null;
  isAuthenticated: boolean;
};

export function SiteHeader({ allowedPortals, userEmail, isAuthenticated }: SiteHeaderProps) {
  const pathname = usePathname();
  const activePortal: PortalId | null = pathname.startsWith("/admin")
    ? "admin"
    : pathname.startsWith("/instructor")
      ? "instructor"
      : pathname.startsWith("/member")
        ? "member"
        : null;

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
      return;
    }
    window.location.href = "/member/discover";
  };

  const label = userEmail ?? "User account";

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-md"
      style={{ background: "rgba(250, 248, 244, 0.92)", borderColor: "var(--line)" }}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/member/discover" className="flex shrink-0 items-center">
            <Image
              src="/Logo.jpg"
              alt="Thayya Official Logo"
              width={160}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-full p-1"
            style={{ background: "white", border: "1px solid var(--line)" }}
          >
            {allowedPortals.map((portal) => {
              const href = portalHomeHref[portal];
              const isActive = activePortal === portal;
              return (
                <Link
                  key={portal}
                  href={href}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all md:px-4 md:text-sm ${
                    isActive ? "bg-[var(--ink)] text-white" : "text-[var(--ink-soft)] hover:text-black"
                  }`}
                >
                  {portalLabel[portal]}
                </Link>
              );
            })}
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: "white", border: "1px solid var(--line)" }}
                aria-label={`User Profile (${label})`}
                title={label}
              >
                <User className="h-4 w-4" style={{ color: "var(--ink-soft)" }} />
              </span>
              <span className="hidden text-xs lg:inline" style={{ color: "var(--ink-muted)" }}>
                {label}
              </span>
              <Link
                href="/dashboard"
                className="hidden rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex md:text-sm"
                style={{ background: "white", border: "1px solid var(--line)", color: "var(--ink)" }}
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full px-3 py-1.5 text-xs font-semibold md:text-sm"
                style={{ background: "white", border: "1px solid var(--line)", color: "var(--ink)" }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full px-3 py-1.5 text-xs font-semibold md:text-sm"
              style={{ background: "white", border: "1px solid var(--line)", color: "var(--ink)" }}
            >
              Log In
            </Link>
          )}
        </div>
      </div>
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 pb-2 md:px-6">
        <div
          className="text-[10px] font-medium tracking-[0.25em] uppercase md:text-[11px]"
          style={{ color: "var(--ink-muted)" }}
        >
          Move · Rise · Shine
        </div>
        <div
          className="text-[10px] uppercase tracking-wider md:text-[11px]"
          style={{ color: "var(--ink-muted)" }}
        >
          Dance fitness · Bangalore
        </div>
      </div>
    </header>
  );
}
