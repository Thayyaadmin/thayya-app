import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";

export function MemberBookingsPage() {
  return (
    <div className="page mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <div className="mb-8">
        <SiteEyebrow className="mb-2">Yours</SiteEyebrow>
        <h1 className="font-display text-3xl font-bold md:text-5xl">My Bookings</h1>
      </div>
      <div
        className="mb-3 text-[10px] font-bold tracking-[0.2em] uppercase"
        style={{ color: "var(--ink-muted)" }}
      >
        Upcoming
      </div>
      <div className="mb-8 space-y-3">
        <div
          className="lift flex items-center gap-4 rounded-2xl p-5"
          style={{ background: "white", border: "1px solid var(--line)" }}
        >
          <div className="w-14 shrink-0 text-center">
            <div className="font-display text-3xl leading-none font-bold gradient-text">29</div>
            <div
              className="mt-1 text-[10px] font-semibold tracking-wider"
              style={{ color: "var(--ink-muted)" }}
            >
              APR
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-bold md:text-lg">Aaja Nachle Intensive</div>
            <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
              Anaya Krishnan · Wed · 7:00 PM
            </div>
          </div>
          <div className="font-display text-base font-bold">₹600</div>
        </div>
        <div
          className="lift flex items-center gap-4 rounded-2xl p-5"
          style={{ background: "white", border: "1px solid var(--line)" }}
        >
          <div className="w-14 shrink-0 text-center">
            <div className="font-display text-3xl leading-none font-bold gradient-text">02</div>
            <div
              className="mt-1 text-[10px] font-semibold tracking-wider"
              style={{ color: "var(--ink-muted)" }}
            >
              MAY
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-bold md:text-lg">Saturday Morning Flow</div>
            <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
              Anaya Krishnan · Sat · 8:00 AM
            </div>
          </div>
          <div className="font-display text-base font-bold">₹350</div>
        </div>
      </div>
    </div>
  );
}
