import Link from "next/link";
import { getInitials, avatarVariant } from "@/lib/text-utils";

export type InstructorDiscoverCardProps = {
  id: string;
  fullName: string | null;
  slug: string | null;
  bio: string | null;
};

export function InstructorDiscoverCard({ id, fullName, slug, bio }: InstructorDiscoverCardProps) {
  const variant = avatarVariant(id);
  const initials = getInitials(fullName);
  const href = slug ? `/instructors/${slug}` : undefined;

  const inner = (
    <>
      <div className={`av-${variant} relative mb-3 aspect-[3/4] overflow-hidden rounded-2xl grain`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-6xl font-bold text-white/95">{initials}</span>
        </div>
      </div>
      <div className="font-display text-base font-bold md:text-lg">{fullName || "Instructor"}</div>
      {bio ? (
        <div className="line-clamp-2 text-xs" style={{ color: "var(--ink-muted)" }}>
          {bio}
        </div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="lift text-left">
        {inner}
      </Link>
    );
  }

  return (
    <div className="cursor-not-allowed opacity-50" aria-disabled>
      {inner}
    </div>
  );
}
