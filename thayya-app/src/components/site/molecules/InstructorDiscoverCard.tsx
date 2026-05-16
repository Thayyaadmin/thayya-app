import Link from "next/link";
import { getInitials, avatarVariant } from "@/lib/text-utils";

export type InstructorDiscoverCardProps = {
  id: string;
  fullName: string | null;
  slug: string | null;
  bio: string | null;
  avatarUrl?: string | null;
};

export function InstructorDiscoverCard({
  id,
  fullName,
  slug,
  bio,
  avatarUrl,
}: InstructorDiscoverCardProps) {
  const variant = avatarVariant(id);
  const initials = getInitials(fullName);
  const href = slug ? `/instructors/${slug}` : undefined;
  const trimmedAvatar = avatarUrl?.trim() ?? "";
  const showPhoto = trimmedAvatar.length > 0;

  const inner = (
    <>
      <div
        className={`relative mb-3 aspect-[3/4] overflow-hidden rounded-2xl ${
          showPhoto ? "bg-black/10" : `av-${variant} grain`
        }`}
      >
        {showPhoto ? (
          <img
            src={trimmedAvatar}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl font-bold text-white/95">{initials}</span>
          </div>
        )}
      </div>
      <div className="font-display text-base font-bold md:text-lg px-4 py-2 rounded-b-2xl">{fullName || "Instructor"}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="lift text-left rounded-2xl">
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
