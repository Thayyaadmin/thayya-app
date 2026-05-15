import { redirect } from "next/navigation";

import { MemberBookingsPage } from "@/components/site/elements/member-bookings-page";
import { fetchMyWorkshopRegistrations } from "@/lib/my-workshop-registrations";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MemberBookingsRoute() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    redirect("/login?next=/member/bookings");
  }

  const { data, error } = await fetchMyWorkshopRegistrations(session.access_token);

  return (
    <MemberBookingsPage
      upcoming={data?.upcoming ?? []}
      past={data?.past ?? []}
      error={error}
    />
  );
}
