import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchDiscoverInstructors, fetchDiscoverWorkshops } from "@/lib/discover-data";
import { MemberDiscoverPage } from "@/components/site/elements/member-discover-page";

export default async function MemberDiscoverRoute() {
  const supabase = await createSupabaseServerClient();
  const [w, i] = await Promise.all([
    fetchDiscoverWorkshops(supabase),
    fetchDiscoverInstructors(supabase),
  ]);

  return (
    <MemberDiscoverPage
      workshops={w.data}
      workshopsError={w.error}
      instructors={i.data}
      instructorsError={i.error}
    />
  );
}
