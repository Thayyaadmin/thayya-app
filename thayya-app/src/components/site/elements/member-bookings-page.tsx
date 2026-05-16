import { MemberPastBookingRow } from "@/components/site/elements/member-past-booking-row";
import { MemberUpcomingBookingRow } from "@/components/site/elements/member-upcoming-booking-row";
import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";
import type { MyWorkshopRegistration } from "@/lib/my-workshop-registrations";

type MemberBookingsPageProps = {
  upcoming: MyWorkshopRegistration[];
  past: MyWorkshopRegistration[];
  error: string | null;
};

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
              <MemberUpcomingBookingRow key={item.registration_id} item={item} />
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
