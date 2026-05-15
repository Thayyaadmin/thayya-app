"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, PartyPopper, Play } from "lucide-react";

import { supabase } from "@/app/supabaseClient";
import {
  formatWorkshopDate,
  formatWorkshopPrice,
  formatWorkshopVenue,
  splitTitleForGradientHeading,
} from "@/lib/workshop-display";
import { workshopPublicPath } from "@/lib/workshop-path";
import { postRegisterWorkshopEdge } from "@/lib/register-workshop-api";
import {
  fetchPublicWorkshopById,
  fetchPublicWorkshopBySlug,
  type PublicWorkshop,
  type PublicWorkshopInstructor,
} from "@/lib/workshop-public";
import { isWorkshopSlug } from "@/lib/workshop-path";

export type WorkshopDetailViewProps = {
  workshop: PublicWorkshop;
  instructor: PublicWorkshopInstructor | null;
  initialRegistered?: boolean;
};

async function fetchWorkshopWithSession(
  w: PublicWorkshop,
  accessToken: string,
) {
  const slug = w.slug?.trim().toLowerCase();
  if (slug && isWorkshopSlug(slug)) {
    return fetchPublicWorkshopBySlug(slug, { accessToken });
  }
  return fetchPublicWorkshopById(w.id, { accessToken });
}

function formatSpotsLabel(w: PublicWorkshop): string {
  if (w.is_past) return "This workshop has ended";
  if (w.is_full) return "Fully booked";
  if (w.spots_remaining === 1) return "1 spot left";
  return `${w.spots_remaining} spots left`;
}

export function WorkshopDetailView({
  workshop: workshopInitial,
  instructor,
  initialRegistered = false,
}: WorkshopDetailViewProps) {
  const router = useRouter();
  const [workshop, setWorkshop] = useState(workshopInitial);
  const [registered, setRegistered] = useState(initialRegistered);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);

  useEffect(() => {
    setWorkshop(workshopInitial);
  }, [workshopInitial]);

  useEffect(() => {
    setRegistered(initialRegistered);
  }, [initialRegistered, workshopInitial.id]);

  useEffect(() => {
    let cancelled = false;

    async function syncFromSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token || cancelled) return;

      const { data } = await fetchWorkshopWithSession(workshopInitial, session.access_token);
      if (cancelled || !data) return;

      setWorkshop(data.workshop);
      if (data.viewer?.is_registered) {
        setRegistered(true);
      }
    }

    void syncFromSession();
    return () => {
      cancelled = true;
    };
  }, [workshopInitial]);

  const title = workshop.title?.trim() || "Untitled workshop";
  const { lead: titleLead, gradient: titleGradient } = splitTitleForGradientHeading(title);
  const instructorName =
    instructor?.full_name?.trim() ||
    workshop.instructor_name?.trim() ||
    "Instructor TBA";
  const venueLine = formatWorkshopVenue(workshop);
  const priceLabel = formatWorkshopPrice(workshop.price);
  const dateLabel = formatWorkshopDate(workshop.date);
  const metaLine = `With ${instructorName} · ${dateLabel} · ${venueLine}`;

  const spotsLabel = formatSpotsLabel(workshop);
  const canRegister = !workshop.is_past && !workshop.is_full && !registered;
  const instructorSlug = instructor?.slug?.trim();
  const returnPath = workshopPublicPath(workshop);

  async function handleRegister() {
    if (!canRegister || registering) return;
    setRegisterError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      router.push(`/login?next=${encodeURIComponent(returnPath)}`);
      return;
    }

    setRegistering(true);
    const result = await postRegisterWorkshopEdge(session.access_token, workshop.id);
    setRegistering(false);

    if (!result.ok) {
      setRegisterError(result.message);
      return;
    }

    setRegistered(true);

    const { data } = await fetchWorkshopWithSession(workshop, session.access_token);
    if (data) {
      setWorkshop(data.workshop);
    } else if (!result.alreadyRegistered) {
      setWorkshop((prev) => {
        const taken = prev.spots_taken + 1;
        const remaining = Math.max(0, prev.slots - taken);
        return {
          ...prev,
          spots_taken: taken,
          spots_remaining: remaining,
          is_full: remaining <= 0,
        };
      });
    }
  }

  const capacityHint =
    workshop.slots > 0
      ? `${workshop.spots_remaining} of ${workshop.slots} spots available`
      : null;

  return (
    <div className="page mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <Link
        href="/member/discover"
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
            {titleLead ? (
              <>
                {titleLead}{" "}
              </>
            ) : null}
            <span className="gradient-text">{titleGradient}</span>
          </h1>
          <div className="mb-6 text-sm" style={{ color: "var(--ink-soft)" }}>
            {instructorSlug ? (
              <>
                With{" "}
                <Link
                  href={`/instructors/${instructorSlug}`}
                  className="font-semibold underline-offset-2 hover:underline"
                  style={{ color: "var(--ink)" }}
                >
                  {instructorName}
                </Link>
                {" · "}
                {dateLabel} · {venueLine}
              </>
            ) : (
              metaLine
            )}
          </div>
          <div className="av-1 relative mb-6 flex aspect-video cursor-pointer items-center justify-center rounded-2xl grain">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur">
              <Play className="h-7 w-7 fill-white text-white" />
            </div>
            <span className="absolute right-3 bottom-3 text-xs font-medium text-white">
              Preview coming soon
            </span>
          </div>
          {instructor?.bio?.trim() ? (
            <p className="mb-5 text-sm leading-relaxed md:text-base" style={{ color: "var(--ink-soft)" }}>
              {instructor.bio.trim()}
            </p>
          ) : (
            <p className="mb-5 text-sm leading-relaxed md:text-base" style={{ color: "var(--ink-soft)" }}>
              Join {instructorName} for {title}. Details and full description will be added by the
              instructor soon.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {(workshop.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
                style={{ background: "var(--bg-warm)", color: "var(--ink-soft)" }}
              >
                {tag}
              </span>
            ))}
            {registered ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
                style={{ background: "var(--t-teal)", color: "white" }}
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                You&apos;re registered
              </span>
            ) : null}
            {!workshop.is_past ? (
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
                style={{ background: "var(--bg-warm)", color: "var(--ink-soft)" }}
              >
                {spotsLabel}
              </span>
            ) : null}
            {workshop.is_past ? (
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold tracking-wider uppercase"
                style={{ background: "var(--bg-warm)", color: "var(--ink-soft)" }}
              >
                Past event
              </span>
            ) : null}
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
            {!registered ? (
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="font-display text-3xl font-bold md:text-4xl">{priceLabel}</span>
                  <span
                    className="shrink-0 text-xs font-bold"
                    style={{
                      color: workshop.is_full || workshop.is_past
                        ? "var(--ink-muted)"
                        : "var(--t-red)",
                    }}
                  >
                    {spotsLabel}
                  </span>
                </div>
                <div className="mb-6 text-xs" style={{ color: "var(--ink-muted)" }}>
                  per person · payment at the venue
                </div>
                {registerError ? (
                  <p
                    className="mb-4 rounded-xl px-3 py-2 text-sm"
                    style={{
                      background: "rgba(220, 38, 38, 0.08)",
                      color: "var(--t-red)",
                    }}
                    role="alert"
                  >
                    {registerError}
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled={!canRegister || registering}
                  onClick={() => void handleRegister()}
                  className="gradient-bg-warm w-full rounded-full py-3.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {registering
                    ? "Registering…"
                    : canRegister
                      ? "Register for workshop"
                      : workshop.is_past
                        ? "Workshop ended"
                        : "Fully booked"}
                </button>
                <p className="mt-3 text-center text-xs" style={{ color: "var(--ink-muted)" }}>
                  Sign in required · no online payment
                </p>
              </div>
            ) : (
              <div className="py-2 text-center">
                {capacityHint ? (
                  <p className="mb-4 text-xs font-bold" style={{ color: "var(--ink-muted)" }}>
                    {capacityHint}
                  </p>
                ) : null}
                <div
                  className="pulse-gold mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: "var(--t-teal)" }}
                >
                  <PartyPopper className="h-7 w-7 text-white" />
                </div>
                <div className="font-display mb-1 text-2xl font-bold">You&apos;re registered!</div>
                <div className="mb-5 text-sm" style={{ color: "var(--ink-soft)" }}>
                  Your spot is reserved. Pay {priceLabel} at the venue.
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
