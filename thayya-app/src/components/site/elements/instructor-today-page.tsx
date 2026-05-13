import Link from "next/link";
import { Play, ArrowUpRight } from "lucide-react";
import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";

export function InstructorTodayPage() {
  return (
    <div className="page mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <div className="mb-8">
        <SiteEyebrow className="mb-2">Monday, 27 April · Bangalore</SiteEyebrow>
        <h1 className="font-display text-4xl leading-[1.05] font-bold md:text-6xl">
          Good morning, <span className="gradient-text">Anaya</span>.<br />
          <span className="font-brush text-3xl md:text-5xl" style={{ color: "var(--t-magenta)" }}>
            let&apos;s move
          </span>
          .
        </h1>
      </div>

      <div className="relative mb-6 overflow-hidden rounded-3xl grain" style={{ background: "var(--ink)" }}>
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "linear-gradient(115deg, transparent 0%, rgba(155,42,142,0.4) 50%, rgba(31,169,160,0.5) 100%)",
          }}
        />
        <div className="relative grid md:grid-cols-2">
          <div className="relative p-8 md:p-12">
            <div
              className="mb-4 inline-block rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.2em] uppercase"
              style={{ background: "rgba(245,130,32,0.18)", color: "var(--t-orange)" }}
            >
              New · April Drop
            </div>
            <h2 className="font-display mb-4 text-3xl leading-[1.05] font-bold text-white md:text-5xl">
              Aaja Nachle{" "}
              <span className="font-brush gradient-text" style={{ fontSize: "0.9em" }}>
                2.0
              </span>
            </h2>
            <p className="mb-6 text-sm leading-relaxed md:text-base" style={{ color: "rgba(255,255,255,0.75)" }}>
              Eight new choreographies. Twelve curated tracks. Released first Friday of every month —
              yours to teach for life.
            </p>
            <Link
              href="/instructor/library"
              className="gradient-bg-warm inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
            >
              <Play className="h-4 w-4 fill-current" /> Open Library
            </Link>
          </div>
          <div className="relative hidden items-center justify-center p-12 md:flex">
            <div className="gradient-bg-vivid absolute inset-8 rounded-2xl opacity-90" />
            <div className="relative font-display text-[180px] leading-none font-bold text-white/90">04</div>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl p-6 md:col-span-2" style={{ background: "white", border: "1px solid var(--line)" }}>
          <div className="mb-2 flex items-start justify-between">
            <div
              className="text-[10px] font-bold tracking-[0.2em] uppercase"
              style={{ color: "var(--ink-muted)" }}
            >
              Next Workshop
            </div>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
              style={{ background: "rgba(232,51,77,0.12)", color: "var(--t-red)" }}
            >
              In 4 hours
            </span>
          </div>
          <div className="font-display mt-2 mb-1 text-xl font-bold md:text-2xl">Bollywood Cardio · Beginner</div>
          <div className="mb-4 text-sm" style={{ color: "var(--ink-soft)" }}>
            6:30 PM at Whitefield Studio · 18 of 25 booked
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--line-soft)" }}>
            <div className="gradient-bg-warm h-full rounded-full" style={{ width: "72%" }} />
          </div>
        </div>
        <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--line)" }}>
          <div
            className="mb-3 text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ color: "var(--ink-muted)" }}
          >
            This Month
          </div>
          <div className="font-display gradient-text text-3xl font-bold md:text-4xl">₹68,400</div>
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--t-teal)" }}>
            <ArrowUpRight className="h-3 w-3" /> +22% vs March
          </div>
        </div>
      </div>
    </div>
  );
}
