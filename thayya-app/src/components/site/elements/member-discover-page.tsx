import { DiscoverHeroSection } from "@/components/site/elements/discover-hero-section";
import { DiscoverInstructorsSection } from "@/components/site/elements/discover-instructors-section";
import { DiscoverWorkshopsSection } from "@/components/site/elements/discover-workshops-section";
import type { DiscoverInstructorRow, DiscoverWorkshopRow } from "@/lib/discover-data";

export type MemberDiscoverPageProps = {
  workshops: DiscoverWorkshopRow[];
  workshopsError: string | null;
  instructors: DiscoverInstructorRow[];
  instructorsError: string | null;
};

export function MemberDiscoverPage({
  workshops,
  workshopsError,
  instructors,
  instructorsError,
}: MemberDiscoverPageProps) {
  return (
    <div className="page mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <DiscoverHeroSection />
      <DiscoverInstructorsSection instructors={instructors} error={instructorsError} />
      <DiscoverWorkshopsSection workshops={workshops} error={workshopsError} />
    </div>
  );
}
