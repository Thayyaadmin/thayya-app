import type { User } from "@supabase/supabase-js";

/** Display name for the signed-in instructor (metadata first, then email local-part). */
export function getInstructorDisplayName(user: User | null): string {
  if (!user) return "Instructor";

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    typeof meta?.full_name === "string" && meta.full_name.trim()
      ? meta.full_name.trim()
      : typeof meta?.name === "string" && meta.name.trim()
        ? meta.name.trim()
        : null;

  if (fullName) return fullName;

  const email = user.email?.trim();
  if (email) {
    const local = email.split("@")[0] ?? "";
    if (local) {
      return local
        .replace(/[._-]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }

  return "Instructor";
}

export function getInstructorInitials(displayName: string): string {
  const t = displayName.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

export function getInstructorAvatarUrl(user: User | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const url = meta?.avatar_url;
  return typeof url === "string" && url.startsWith("http") ? url : null;
}
