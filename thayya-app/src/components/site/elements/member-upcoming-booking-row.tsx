"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/app/supabaseClient";
import { MemberCheckInButton } from "@/components/site/elements/member-check-in-button";
import { postCancelWorkshopRegistration } from "@/lib/cancel-workshop-registration-api";
import { formatWorkshopPrice, formatWorkshopVenue } from "@/lib/workshop-display";
import type { MyWorkshopRegistration } from "@/lib/my-workshop-registrations";
import { workshopPublicPath } from "@/lib/workshop-path";

type MemberUpcomingBookingRowProps = {
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

export function MemberUpcomingBookingRow({ item }: MemberUpcomingBookingRowProps) {
  const router = useRouter();
  const w = item.workshop;
  const { day, month } = formatBookingDateParts(w.date);
  const title = w.title?.trim() || "Untitled workshop";
  const href = workshopPublicPath(w);
  const [attended, setAttended] = useState(item.attended ?? false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const canCheckIn = item.can_mark_attendance === true;

  async function handleCancel() {
    const confirmed = window.confirm(
      `Cancel your booking for "${title}"? Your spot will be released for others.`,
    );
    if (!confirmed) return;

    setCancelling(true);
    setCancelError(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setCancelError("Sign in to cancel this booking.");
      setCancelling(false);
      return;
    }

    const result = await postCancelWorkshopRegistration(session.access_token, w.id);
    setCancelling(false);

    if (!result.ok) {
      setCancelError(result.message);
      return;
    }

    router.refresh();
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center"
      style={{ background: "white", border: "1px solid var(--line)" }}
    >
      <Link href={href} className="lift flex min-w-0 flex-1 items-center gap-4">
        <div className="w-14 shrink-0 text-center">
          <div className="font-display text-3xl leading-none font-bold gradient-text">{day}</div>
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
          </div>
        </div>
        <div className="font-display hidden shrink-0 text-base font-bold sm:block">
          {formatWorkshopPrice(w.price)}
        </div>
      </Link>

      <div className="flex shrink-0 flex-col items-stretch gap-2 border-t pt-3 sm:items-center sm:justify-center sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
        {canCheckIn ? (
          <MemberCheckInButton
            workshopId={w.id}
            attended={attended}
            canMarkAttendance
            onAttendedChange={setAttended}
          />
        ) : null}
        <button
          type="button"
          className="text-sm font-semibold underline-offset-2 hover:underline disabled:opacity-50"
          style={{ color: "var(--t-red)" }}
          disabled={cancelling}
          onClick={() => void handleCancel()}
        >
          {cancelling ? "Cancelling…" : "Cancel booking"}
        </button>
        {cancelError ? (
          <p
            className="max-w-[200px] text-center text-xs"
            style={{ color: "var(--t-red)" }}
            role="alert"
          >
            {cancelError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
