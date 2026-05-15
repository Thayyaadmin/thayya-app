import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, BadgeCheck } from "lucide-react";
import type { Metadata } from "next";

import { fetchPublicInstructorBySlug } from "@/lib/instructor-public";

type RouteParams = { slug: string };

type WorkshopSummary = {
  id: string;
  title: string;
  date: string | null;
  price: number | null;
};

// Deterministic 1..4 from any string, used to pick an av-* color class so
// the same instructor always gets the same avatar background.
function avatarVariant(id: string): 1 | 2 | 3 | 4 {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return ((Math.abs(hash) % 4) + 1) as 1 | 2 | 3 | 4;
}

function initialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function formatWorkshopDate(value: string | null): string {
  if (!value) return "Date TBA";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPrice(value: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Leading name segment(s) + last segment for gradient highlight (discover-hero style). */
function splitNameForGradientHeading(fullName: string): { lead: string; gradient: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { lead: "", gradient: fullName.trim() || "Instructor" };
  }
  if (parts.length === 1) {
    return { lead: "", gradient: parts[0]! };
  }
  return {
    lead: parts.slice(0, -1).join(" "),
    gradient: parts[parts.length - 1]!,
  };
}

async function loadInstructor(slug: string) {
  const { data, error } = await fetchPublicInstructorBySlug(slug);
  if (error) {
    console.error("[instructor page] instructor-public:", error);
    return null;
  }
  if (!data) return null;

  const workshops = data.workshops.map((w) => ({
    id: w.id,
    title: w.title ?? "",
    date: w.date,
    price: w.price,
  })) satisfies WorkshopSummary[];

  return {
    profile: data.profile,
    workshops,
  };
}

export async function generateMetadata(
  { params }: { params: Promise<RouteParams> },
): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadInstructor(slug);
  if (!result) {
    return { title: "Instructor not found · Thayya" };
  }
  const { profile } = result;
  const description = profile.bio?.trim()
    ? profile.bio.trim()
    : `Workshops and classes by ${profile.full_name} on Thayya.`;
  return {
    title: `${profile.full_name} · Thayya`,
    description,
    openGraph: {
      title: `${profile.full_name} · Thayya`,
      description,
      type: "profile",
    },
  };
}

export default async function InstructorPage(
  { params }: { params: Promise<RouteParams> },
) {
  const { slug } = await params;
  const result = await loadInstructor(slug);
  if (!result) notFound();

  const { profile, workshops } = result;
  const initials = initialsFromName(profile.full_name);
  const avVariant = avatarVariant(profile.id);
  const avatarSrc = profile.avatar_url?.trim() ?? "";
  const showAvatarPhoto = avatarSrc.length > 0;
  const bio =
    profile.bio?.trim() ||
    `${profile.full_name} hasn't added a bio yet — check back soon for more about their style and classes.`;
  const { lead: nameLead, gradient: nameGradient } = splitNameForGradientHeading(profile.full_name);

  return (
    <div className="page mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <Link
        href="/"
        className="mb-6 flex items-center gap-1 text-sm"
        style={{ color: "var(--ink-soft)" }}
      >
        <ChevronLeft className="h-4 w-4" /> Back to discover
      </Link>

      <div className="mb-12 grid items-start gap-8 md:grid-cols-3 md:gap-10">
        <div
          className={`relative mx-auto aspect-square max-w-[320px] overflow-hidden rounded-3xl md:mx-0 ${
            showAvatarPhoto ? "bg-black/10" : `av-${avVariant} grain`
          }`}
        >
          {showAvatarPhoto ? (
            <img
              src={avatarSrc}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-7xl font-bold text-white/95 md:text-8xl">
              {initials}
            </div>
          )}
          <div className="absolute right-4 bottom-4 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold tracking-wider uppercase backdrop-blur">
            <BadgeCheck className="h-3 w-3" style={{ color: "var(--t-magenta)" }} /> Instructor
          </div>
        </div>
        <div className="md:col-span-2">
          <div
            className="mb-3 text-[11px] font-semibold tracking-[0.25em] uppercase"
            style={{ color: "var(--ink-muted)" }}
          >
            Thayya Instructor
          </div>
          <h1 className="font-display mb-4 text-4xl leading-[1.05] font-bold md:text-6xl">
            {nameLead ? (
              <>
                {nameLead}{" "}
              </>
            ) : null}
            <span className="gradient-text">{nameGradient}</span>
          </h1>
          <p className="mb-6 text-base leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            {bio}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="gradient-bg-warm rounded-full px-5 py-2.5 text-sm font-bold text-white"
            >
              Follow
            </button>
            <button
              type="button"
              className="rounded-full border px-5 py-2.5 text-sm font-bold"
              style={{ borderColor: "var(--line)", background: "white" }}
            >
              Refer a friend
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div
          className="mb-1 text-[10px] font-semibold tracking-[0.25em] uppercase"
          style={{ color: "var(--ink-muted)" }}
        >
          Schedule
        </div>
        <h2 className="font-display text-2xl font-bold md:text-3xl">Upcoming workshops</h2>
      </div>

      {workshops.length === 0 ? (
        <p
          className="rounded-2xl p-5 text-sm"
          style={{
            background: "white",
            border: "1px solid var(--line)",
            color: "var(--ink-muted)",
          }}
        >
          No upcoming workshops yet. Follow {profile.full_name} to be the first to know.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {workshops.map((ws) => {
            const price = formatPrice(ws.price);
            return (
              <div
                key={ws.id}
                className="lift rounded-2xl p-5 text-left"
                style={{ background: "white", border: "1px solid var(--line)" }}
              >
                <div className="font-display mb-1 text-lg font-bold">
                  {ws.title || "Untitled workshop"}
                </div>
                <div className="mb-4 text-xs" style={{ color: "var(--ink-muted)" }}>
                  {formatWorkshopDate(ws.date)}
                </div>
                {price ? (
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-bold gradient-text">{price}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
