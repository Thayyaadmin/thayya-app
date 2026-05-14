import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/profile";
import { fetchDiscoverInstructors, fetchDiscoverWorkshops } from "@/lib/discover-data";
import { MemberDiscoverPage } from "@/components/site/elements/member-discover-page";

export default async function MemberDiscoverRoute() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfileById(supabase, user.id) : null;
  const isMember = profile?.user_type === "member";

  const w = await fetchDiscoverWorkshops();

  if (isMember) {
    return (
      <MemberDiscoverPage
        workshops={w.data}
        workshopsError={w.error}
        instructors={[]}
        instructorsError={null}
        useMemberLocationInstructors
      />
    );
  }

  const i = await fetchDiscoverInstructors();

  return (
    <MemberDiscoverPage
      workshops={w.data}
      workshopsError={w.error}
      instructors={i.data}
      instructorsError={i.error}
    />
  );
}
