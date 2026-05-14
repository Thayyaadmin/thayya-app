import { SiteEyebrow } from "@/components/site/atoms/SiteEyebrow";
import { DiscoverSearchBar } from "@/components/site/molecules/DiscoverSearchBar";

export function DiscoverHeroSection() {
  return (
    <>
      <div className="mb-10 md:mb-14">
        <SiteEyebrow className="mb-3">Bangalore · This week</SiteEyebrow>
        <h1 className="font-display text-4xl leading-[1.05] font-bold md:text-7xl md:leading-[1.05]">
          Find your <span className="gradient-text">rhythm</span>.<br />
          Move with your{" "}
          <span className="font-brush" style={{ color: "var(--t-magenta)" }}>
            tribe
          </span>
          .
        </h1>
        <p className="mt-4 max-w-xl text-base md:text-lg" style={{ color: "var(--ink-soft)" }}>
          Indian dance fitness, taught by India&apos;s best instructors. Book a workshop, sweat to a
          Bollywood beat, then do it again tomorrow.
        </p>
      </div>
      <DiscoverSearchBar />
    </>
  );
}
