import { Award, Heart, Sparkles, ArrowRight } from "lucide-react";
import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";

export function MemberMembershipPage() {
  return (
    <div className="page mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <div className="mb-8">
        <SiteEyebrow className="mb-2">Your Tribe</SiteEyebrow>
        <h1 className="font-display text-3xl font-bold md:text-5xl">Membership</h1>
      </div>
      <div
        className="relative mb-6 overflow-hidden rounded-3xl p-8 grain md:p-10"
        style={{ background: "var(--ink)" }}
      >
        <div className="gradient-bg absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-30 blur-3xl" />
        <div className="relative">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <div
                className="mb-1 text-[10px] font-bold tracking-[0.25em] uppercase"
                style={{ color: "var(--t-orange)" }}
              >
                Thayya Member · Marigold Tier
              </div>
              <div className="font-brush mt-1 text-2xl text-white/90 md:text-3xl">The tribe is rising</div>
            </div>
            <Award className="h-7 w-7 md:h-9 md:w-9" style={{ color: "var(--t-gold)" }} />
          </div>
          <div className="font-display mb-2 text-5xl font-bold text-white md:text-7xl">1,240</div>
          <div className="mb-6 text-sm md:text-base" style={{ color: "rgba(255,255,255,0.7)" }}>
            loyalty points · ₹620 redeemable credit
          </div>
          <div className="mb-2 h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
            <div className="gradient-bg h-full rounded-full" style={{ width: "62%" }} />
          </div>
          <div className="text-xs font-medium" style={{ color: "var(--t-gold)" }}>
            <strong>760 points</strong> to <strong>Tabla Tier</strong>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="lift rounded-2xl p-6" style={{ background: "white", border: "1px solid var(--line)" }}>
          <Heart className="mb-3 h-6 w-6" style={{ color: "var(--t-red)" }} />
          <div className="font-display mb-1 text-xl font-bold">Refer a friend</div>
          <div className="mb-4 text-sm" style={{ color: "var(--ink-soft)" }}>
            Both of you earn 200 points when they book their first workshop.
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-sm font-bold"
            style={{ color: "var(--t-magenta)" }}
          >
            Get my code <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="lift gradient-border rounded-2xl p-6" style={{ background: "white" }}>
          <Sparkles className="mb-3 h-6 w-6" style={{ color: "var(--t-orange)" }} />
          <div className="font-display mb-1 text-xl font-bold">Studio Membership</div>
          <div className="mb-4 text-sm" style={{ color: "var(--ink-soft)" }}>
            ₹1,999/month · 8 workshops + earn 2x points + priority booking.
          </div>
          <button
            type="button"
            className="gradient-bg-warm rounded-full px-4 py-2 text-sm font-bold text-white"
          >
            Upgrade →
          </button>
        </div>
      </div>
    </div>
  );
}
