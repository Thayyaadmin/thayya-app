import { PartyPopper, UsersRound, TrendingUp, IndianRupee } from "lucide-react";
import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";

export function AdminOverviewPage() {
  return (
    <div className="page mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <div
        className="relative mb-8 min-h-[200px] overflow-hidden rounded-3xl grain"
        style={{ background: "var(--ink)" }}
      >
        <div
          className="spark absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-40"
          style={{
            background: "radial-gradient(circle, var(--t-gold) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="spark absolute -right-32 -bottom-32 h-96 w-96 rounded-full opacity-30"
          style={{
            background: "radial-gradient(circle, var(--t-orange) 0%, transparent 70%)",
            filter: "blur(40px)",
            animationDelay: "1s",
          }}
        />
        <div className="relative grid items-center gap-6 p-8 md:grid-cols-5 md:p-12">
          <div className="md:col-span-3">
            <div
              className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.25em] uppercase"
              style={{ background: "rgba(212, 160, 39, 0.18)", color: "var(--t-gold)" }}
            >
              <PartyPopper className="h-3.5 w-3.5" /> First Milestone Unlocked
            </div>
            <h2
              className="font-display mb-3 font-bold leading-[0.95] text-white"
              style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
            >
              <span style={{ color: "var(--t-gold)" }}>50</span> Instructors
            </h2>
            <h3 className="font-display mb-3 text-2xl font-bold text-white md:text-3xl">Registered.</h3>
            <p className="font-brush mb-4 text-3xl md:text-4xl" style={{ color: "var(--t-gold)" }}>
              The tribe is rising.
            </p>
          </div>
          <div className="relative hidden items-center justify-center md:col-span-2 md:flex">
            <div
              className="absolute inset-0 rounded-full opacity-30"
              style={{
                background: "radial-gradient(circle, var(--t-gold) 0%, transparent 60%)",
                filter: "blur(30px)",
              }}
            />
            <div className="relative">
              <div
                className="font-display text-[200px] leading-none font-black"
                style={{ color: "var(--t-gold)", textShadow: "0 4px 24px rgba(212, 160, 39, 0.4)" }}
              >
                50
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SiteEyebrow className="mb-2">Platform Overview · April 2026</SiteEyebrow>
        <h1 className="font-display text-3xl leading-[1.05] font-bold md:text-5xl">
          The network is <span className="gradient-text">thriving</span>.
        </h1>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid var(--line)" }}>
          <div className="mb-5 flex items-start justify-between">
            <UsersRound className="h-4 w-4" style={{ color: "var(--ink-muted)" }} />
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: "rgba(31,169,160,0.12)", color: "var(--t-teal)" }}
            >
              +12%
            </span>
          </div>
          <div className="font-display mb-1 text-2xl font-bold md:text-3xl">284</div>
          <div className="text-[11px] font-medium" style={{ color: "var(--ink-muted)" }}>
            Active Instructors
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid var(--line)" }}>
          <div className="mb-5 flex items-start justify-between">
            <TrendingUp className="h-4 w-4" style={{ color: "var(--ink-muted)" }} />
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: "rgba(31,169,160,0.12)", color: "var(--t-teal)" }}
            >
              +18%
            </span>
          </div>
          <div className="font-display mb-1 text-2xl font-bold md:text-3xl">₹14.2L</div>
          <div className="text-[11px] font-medium" style={{ color: "var(--ink-muted)" }}>
            Monthly Recurring Rev
          </div>
        </div>
        <div className="rounded-2xl p-5" style={{ background: "white", border: "1px solid var(--line)" }}>
          <div className="mb-5 flex items-start justify-between">
            <IndianRupee className="h-4 w-4" style={{ color: "var(--ink-muted)" }} />
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: "rgba(31,169,160,0.12)", color: "var(--t-teal)" }}
            >
              +24%
            </span>
          </div>
          <div className="font-display mb-1 text-2xl font-bold md:text-3xl">₹47.8L</div>
          <div className="text-[11px] font-medium" style={{ color: "var(--ink-muted)" }}>
            GMV This Month
          </div>
        </div>
      </div>
    </div>
  );
}
