"use client";

import Link from "next/link";
import { useState } from "react";
import {
  PartyPopper,
  Play,
  Smartphone,
  Check,
  CreditCard,
  Building2,
} from "lucide-react";

export function MemberBookCheckout() {
  const [checkoutStep, setCheckoutStep] = useState(1);

  return (
    <div className="page mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <Link
        href="/"
        className="mb-6 flex items-center gap-1 text-sm"
        style={{ color: "var(--ink-soft)" }}
      >
        ← Back to discover
      </Link>
      <div className="grid gap-6 md:grid-cols-5 md:gap-8">
        <div className="md:col-span-3">
          <div
            className="mb-2 text-[11px] font-semibold tracking-[0.25em] uppercase"
            style={{ color: "var(--ink-muted)" }}
          >
            Workshop
          </div>
          <h1 className="font-display mb-3 text-3xl leading-[1.05] font-bold md:text-5xl">
            Aaja Nachle <span className="gradient-text">Intensive</span>
          </h1>
          <div className="mb-6 text-sm" style={{ color: "var(--ink-soft)" }}>
            With Anaya Krishnan · Wed 29 April · 7:00 PM · Indiranagar Studio
          </div>
          <div className="av-1 relative mb-6 flex aspect-video cursor-pointer items-center justify-center rounded-2xl grain">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur">
              <Play className="h-7 w-7 fill-white text-white" />
            </div>
            <span className="absolute right-3 bottom-3 text-xs font-medium text-white">2:14 preview</span>
          </div>
          <p className="mb-5 text-sm leading-relaxed md:text-base" style={{ color: "var(--ink-soft)" }}>
            A 90-minute deep dive into the April choreography drop. We&apos;ll break down each section,
            drill the formations, then end with a full run-through. Open to all levels with prior dance
            experience.
          </p>
          <div className="flex flex-wrap gap-2">
            {["90 minutes", "All levels", "Bring water", "AC studio"].map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
                style={{ background: "var(--bg-warm)", color: "var(--ink-soft)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <div
            className="rounded-2xl p-6 md:sticky md:top-32"
            style={{
              background: "white",
              border: "1px solid var(--line)",
              boxShadow: "0 8px 32px rgba(10,10,10,0.06)",
            }}
          >
            {checkoutStep === 1 ? (
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="font-display text-3xl font-bold md:text-4xl">₹600</span>
                  <span className="text-xs font-bold" style={{ color: "var(--t-red)" }}>
                    3 spots left
                  </span>
                </div>
                <div className="mb-6 text-xs" style={{ color: "var(--ink-muted)" }}>
                  per person · all taxes included
                </div>
                <div
                  className="mb-3 text-[10px] font-semibold tracking-[0.2em] uppercase"
                  style={{ color: "var(--ink-muted)" }}
                >
                  Pay with
                </div>
                <div className="mb-5 space-y-2">
                  <button
                    type="button"
                    className="gradient-border flex w-full items-center justify-between rounded-xl p-3 text-sm font-semibold"
                    style={{ background: "var(--bg-warm)" }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="gradient-bg-cool flex h-7 w-7 items-center justify-center rounded">
                        <Smartphone className="h-3.5 w-3.5 text-white" />
                      </span>{" "}
                      UPI · GPay, PhonePe
                    </span>
                    <Check className="h-4 w-4" style={{ color: "var(--t-magenta)" }} />
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border p-3 text-sm font-medium"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" style={{ color: "var(--ink-muted)" }} /> Credit /
                      Debit Card
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border p-3 text-sm font-medium"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" style={{ color: "var(--ink-muted)" }} /> Net Banking
                    </span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckoutStep(2)}
                  className="gradient-bg-warm w-full rounded-full py-3.5 text-sm font-bold text-white"
                >
                  Pay ₹600 via UPI →
                </button>
                <div className="mt-3 text-center text-[10px]" style={{ color: "var(--ink-muted)" }}>
                  Secured by Razorpay · 256-bit encryption
                </div>
              </div>
            ) : (
              <div className="py-2 text-center">
                <div
                  className="pulse-gold mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: "var(--t-teal)" }}
                >
                  <PartyPopper className="h-7 w-7 text-white" />
                </div>
                <div className="font-display mb-1 text-2xl font-bold">You&apos;re in!</div>
                <div className="mb-1 text-sm" style={{ color: "var(--ink-soft)" }}>
                  Confirmation sent via WhatsApp
                </div>
                <div className="gradient-text mb-5 inline-block text-xs font-bold">
                  +25 loyalty points earned
                </div>
                <Link
                  href="/member/bookings"
                  className="block w-full rounded-full py-3 text-sm font-bold text-white"
                  style={{ background: "var(--ink)" }}
                >
                  View my bookings
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
