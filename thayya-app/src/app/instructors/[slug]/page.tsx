import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, BadgeCheck } from "lucide-react";
import type { Metadata } from "next";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileBySlug } from "@/lib/profile";

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

async function loadInstructor(slug: string) {
  const supabase = await createSupabaseServerClient();
  const profile = await getProfileBySlug(supabase, slug);
  if (!profile) return null;
  if (profile.user_type !== "instructor" && profile.user_type !== "admin") {
    // Slugs exist on every profile, but only instructors get a public page.
    return null;
  }

  const nowIso = new Date().toISOString();
  const { data: workshops, error } = await supabase
    .from("workshops")
    .select("id, title, date, price")
    .eq("instructor_id", profile.id)
    .or(`date.is.null,date.gte.${nowIso}`)
    .order("date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[instructor page] workshops fetch:", error.message);
  }

  return {
    profile,
    workshops: (workshops ?? []) as WorkshopSummary[],
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
  const bio =
    profile.bio?.trim() ||
    `${profile.full_name} hasn't added a bio yet — check back soon for more about their style and classes.`;

  return (
    <div className="page max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
      <Link
        href="/"
        className="flex items-center gap-1 text-sm mb-6"
        style={{ color: "var(--ink-soft)" }}
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </Link>

      <div className="grid md:grid-cols-3 gap-8 md:gap-10 items-start mb-12">
        <div
          className={`aspect-square rounded-3xl av-${avVariant} grain relative max-w-[320px] mx-auto md:mx-0`}
        >
          <div className="w-full h-full flex items-center justify-center font-display text-7xl md:text-8xl font-bold text-white/95">
            {initials}
          </div>
          <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <BadgeCheck className="w-3 h-3" style={{ color: "var(--t-magenta)" }} /> Instructor
          </div>
        </div>
        <div className="md:col-span-2">
          <div
            className="text-[11px] tracking-[0.25em] uppercase mb-3 font-semibold"
            style={{ color: "var(--ink-muted)" }}
          >
            Thayya Instructor
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 leading-[1.05]">
            {profile.full_name}
          </h1>
          <p
            className="text-base mb-6 leading-relaxed"
            style={{ color: "var(--ink-soft)" }}
          >
            {bio}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="gradient-bg-warm text-white px-5 py-2.5 rounded-full text-sm font-bold"
            >
              Follow
            </button>
            <button
              type="button"
              className="px-5 py-2.5 rounded-full text-sm font-bold border"
              style={{ borderColor: "var(--line)", background: "white" }}
            >
              Refer a friend
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div
          className="text-[10px] tracking-[0.25em] uppercase mb-1 font-semibold"
          style={{ color: "var(--ink-muted)" }}
        >
          Schedule
        </div>
        <h2 className="font-display text-2xl md:text-3xl font-bold">Upcoming workshops</h2>
      </div>

      {workshops.length === 0 ? (
        <p
          className="text-sm rounded-2xl p-5"
          style={{
            background: "white",
            border: "1px solid var(--line)",
            color: "var(--ink-muted)",
          }}
        >
          No upcoming workshops yet. Follow {profile.full_name} to be the first to know.
        </p>
      ) : (
        <div className="grid md:grid-cols-3 gap-3">
          {workshops.map((ws) => {
            const price = formatPrice(ws.price);
            return (
              <div
                key={ws.id}
                className="lift text-left p-5 rounded-2xl"
                style={{ background: "white", border: "1px solid var(--line)" }}
              >
                <div className="font-display text-lg font-bold mb-1">
                  {ws.title || "Untitled workshop"}
                </div>
                <div className="text-xs mb-4" style={{ color: "var(--ink-muted)" }}>
                  {formatWorkshopDate(ws.date)}
                </div>
                {price ? (
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-bold gradient-text">
                      {price}
                    </span>
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
