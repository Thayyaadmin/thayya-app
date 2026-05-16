import Link from "next/link";

import { MemberPastBookingRow } from "@/components/site/elements/member-past-booking-row";
import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";
import { formatWorkshopPrice, formatWorkshopVenue } from "@/lib/workshop-display";
import type { MyWorkshopRegistration } from "@/lib/my-workshop-registrations";
import { workshopPublicPath } from "@/lib/workshop-path";

type MemberBookingsPageProps = {
  upcoming: MyWorkshopRegistration[];
  past: MyWorkshopRegistration[];
  error: string | null;
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

function BookingRow({ item }: { item: MyWorkshopRegistration }) {
  const w = item.workshop;
  const { day, month } = formatBookingDateParts(w.date);
  const title = w.title?.trim() || "Untitled workshop";
  const href = workshopPublicPath(w);

  return (
    <Link
      href={href}
      className="lift flex items-center gap-4 rounded-2xl p-5"
      style={{ background: "white", border: "1px solid var(--line)" }}
    >
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
      <div className="font-display shrink-0 text-base font-bold">
        {formatWorkshopPrice(w.price)}
      </div>
    </Link>
  );
}

function BookingSection({
  label,
  items,
  emptyMessage,
  variant = "upcoming",
}: {
  label: string;
  items: MyWorkshopRegistration[];
  emptyMessage: string;
  variant?: "upcoming" | "past";
}) {
  return (
    <>
      <div
        className="mb-3 text-[10px] font-bold tracking-[0.2em] uppercase"
        style={{ color: "var(--ink-muted)" }}
      >
        {label}
      </div>
      {items.length === 0 ? (
        <p
          className="mb-8 rounded-2xl p-5 text-sm"
          style={{
            background: "white",
            border: "1px solid var(--line)",
            color: "var(--ink-muted)",
          }}
        >
          {emptyMessage}
        </p>
      ) : (
        <div className="mb-8 space-y-3">
          {items.map((item) =>
            variant === "past" ? (
              <MemberPastBookingRow key={item.registration_id} item={item} />
            ) : (
              <BookingRow key={item.registration_id} item={item} />
            ),
          )}
        </div>
      )}
    </>
  );
}

export function MemberBookingsPage({ upcoming, past, error }: MemberBookingsPageProps) {
  return (
    <div className="page mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <div className="mb-8">
        <SiteEyebrow className="mb-2">Yours</SiteEyebrow>
        <h1 className="font-display text-3xl font-bold md:text-5xl">My Bookings</h1>
      </div>

      {error ? (
        <p
          className="mb-8 rounded-2xl p-5 text-sm"
          style={{
            background: "rgba(220, 38, 38, 0.08)",
            color: "var(--t-red)",
          }}
          role="alert"
        >
          Could not load bookings: {error}
        </p>
      ) : null}

      <BookingSection
        label="Upcoming"
        items={upcoming}
        emptyMessage="No upcoming workshops. Browse discover to find your next class."
      />

      <BookingSection
        label="Past"
        items={past}
        variant="past"
        emptyMessage="No past workshops yet."
      />
    </div>
  );
}
