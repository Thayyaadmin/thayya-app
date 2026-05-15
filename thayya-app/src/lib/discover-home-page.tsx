import { MemberDiscoverPage } from "@/components/site/elements/member-discover-page";
import { fetchDiscoverWorkshops } from "@/lib/discover-data";
import { getProfileById } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MemberPortalShell } from "@/portals/member/MemberPortalShell";

export async function DiscoverHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfileById(supabase, user.id) : null;
  const isMember = profile?.user_type === "member";

  const w = await fetchDiscoverWorkshops();

  const discover = (
    <MemberDiscoverPage
      workshops={w.data}
      workshopsError={w.error}
      instructors={[]}
      instructorsError={null}
      useMemberLocationInstructors
    />
  );

  if (isMember) {
    return <MemberPortalShell>{discover}</MemberPortalShell>;
  }

  return discover;
}
