import { redirect } from "next/navigation";

import { workshopPublicPath } from "@/lib/workshop-path";
import { fetchPublicWorkshopById, isWorkshopId } from "@/lib/workshop-public";

type SearchParams = { id?: string };

export default async function MemberBookRoute({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { id } = await searchParams;
  const trimmed = typeof id === "string" ? id.trim() : "";
  if (trimmed) {
    if (isWorkshopId(trimmed)) {
      const { data } = await fetchPublicWorkshopById(trimmed);
      if (data?.workshop) {
        redirect(workshopPublicPath(data.workshop));
      }
    }
    redirect(`/workshops/${trimmed}`);
  }
  redirect("/member/discover");
}
