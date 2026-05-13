import { fetchDiscoverInstructors, fetchDiscoverWorkshops } from "@/lib/discover-data";
import { MemberDiscoverPage } from "@/components/site/elements/member-discover-page";

export default async function MemberDiscoverRoute() {
  const [w, i] = await Promise.all([fetchDiscoverWorkshops(), fetchDiscoverInstructors()]);

  return (
    <MemberDiscoverPage
      workshops={w.data}
      workshopsError={w.error}
      instructors={i.data}
      instructorsError={i.error}
    />
  );
}
