import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { WorkshopDetailView } from "@/components/site/elements/workshop-detail-view";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { workshopPublicPath } from "@/lib/workshop-path";
import {
  fetchPublicWorkshopByKey,
  isWorkshopId,
} from "@/lib/workshop-public";

type RouteParams = { slug: string };

async function loadWorkshop(key: string, accessToken?: string | null) {
  const { data, error } = await fetchPublicWorkshopByKey(key, { accessToken });
  if (error) {
    console.error("[workshop page] workshop-public:", error);
    return null;
  }
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadWorkshop(slug);
  if (!result) {
    return { title: "Workshop not found · Thayya" };
  }
  const title = result.workshop.title?.trim() || "Workshop";
  const instructor = result.instructor?.full_name?.trim();
  const description = instructor
    ? `${title} with ${instructor} on Thayya.`
    : `${title} on Thayya.`;
  return {
    title: `${title} · Thayya`,
    description,
    openGraph: {
      title: `${title} · Thayya`,
      description,
      type: "website",
    },
  };
}

export default async function WorkshopPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug: routeKey } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const result = await loadWorkshop(routeKey, session?.access_token ?? null);
  if (!result) notFound();

  if (isWorkshopId(routeKey) && result.workshop.slug) {
    redirect(workshopPublicPath(result.workshop));
  }

  const initialRegistered = result.viewer?.is_registered === true;

  return (
    <WorkshopDetailView
      workshop={result.workshop}
      instructor={result.instructor}
      initialRegistered={initialRegistered}
    />
  );
}
