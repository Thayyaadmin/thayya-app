"use client";

import Link from "next/link";
import { useState } from "react";

import { StarRating } from "@/components/site/atoms/StarRating";
import { MemberCheckInButton } from "@/components/site/elements/member-check-in-button";
import { WorkshopReviewDialog } from "@/components/site/elements/workshop-review-dialog";
import { formatWorkshopPrice, formatWorkshopVenue } from "@/lib/workshop-display";
import type { MyWorkshopRegistration } from "@/lib/my-workshop-registrations";
import { workshopPublicPath } from "@/lib/workshop-path";

type MemberPastBookingRowProps = {
  item: MyWorkshopRegistration;
};

function formatBookingDateParts(dateValue: string | null): { day: string; month: string } {
  if (!dateValue) return { day: "—", month: "TBA" };
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return { day: "—", month: "?" };
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
  };
}

function formatBookingSubtitle(item: MyWorkshopRegistration): string {
  const w = item.workshop;
  const name = w.instructor_name || "Instructor TBA";
  if (!w.date) return `${name} · Date TBA`;
  const d = new Date(w.date);
  if (Number.isNaN(d.getTime())) return name;
  const when = d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  const venue = formatWorkshopVenue(w);
  return venue !== "Venue TBA" ? `${name} · ${when} · ${venue}` : `${name} · ${when}`;
}

export function MemberPastBookingRow({ item }: MemberPastBookingRowProps) {
  const w = item.workshop;
  const { day, month } = formatBookingDateParts(w.date);
  const title = w.title?.trim() || "Untitled workshop";
  const href = workshopPublicPath(w);
  const [reviewRating, setReviewRating] = useState<number | null>(item.review_rating ?? null);
  const [attended, setAttended] = useState(item.attended ?? false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const canCheckIn = item.can_mark_attendance === true;

  return (
    <>
      <div
        className="flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center"
        style={{ background: "white", border: "1px solid var(--line)" }}
      >
        <Link href={href} className="lift flex min-w-0 flex-1 items-center gap-4">
          <div className="w-14 shrink-0 text-center">
            <div className="font-display text-3xl leading-none font-bold gradient-text">
              {day}
            </div>
            <div
              className="mt-1 text-[10px] font-semibold tracking-wider"
              style={{ color: "var(--ink-muted)" }}
            >
              {month}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-base font-bold md:text-lg">{title}</div>
            <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
              {formatBookingSubtitle(item)}
              {attended ? (
                <span className="ml-1 font-medium" style={{ color: "var(--t-teal)" }}>
                  · Checked in
                </span>
              ) : null}
            </div>
          </div>
          <div className="font-display hidden shrink-0 text-base font-bold sm:block">
            {formatWorkshopPrice(w.price)}
          </div>
        </Link>

        <div className="flex shrink-0 flex-col items-stretch gap-3 border-t pt-3 sm:items-center sm:justify-center sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          <MemberCheckInButton
            workshopId={w.id}
            attended={attended}
            canMarkAttendance={canCheckIn}
            onAttendedChange={setAttended}
          />
          {reviewRating != null ? (
            <div className="flex flex-col items-start gap-1 sm:items-center">
              <span
                className="text-[10px] font-semibold tracking-wider uppercase"
                style={{ color: "var(--ink-muted)" }}
              >
                Your rating
              </span>
              <StarRating value={reviewRating} size="sm" />
              <button
                type="button"
                className="text-xs font-medium underline-offset-2 hover:underline"
                style={{ color: "var(--ink-soft)" }}
                onClick={() => setDialogOpen(true)}
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="gradient-bg-warm rounded-full px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              disabled={!attended}
              title={!attended ? "Check in before rating this class" : undefined}
              onClick={() => setDialogOpen(true)}
            >
              Rate class
            </button>
          )}
        </div>
      </div>

      <WorkshopReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workshopId={w.id}
        workshopTitle={title}
        initialRating={reviewRating}
        onSubmitted={(rating) => setReviewRating(rating)}
      />
    </>
  );
}
