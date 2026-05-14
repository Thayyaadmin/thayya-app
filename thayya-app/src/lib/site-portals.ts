import type { UserType } from "@/lib/profile";

export type PortalId = "member" | "instructor" | "admin";

export function allowedPortalsForUser(userType: UserType | null): PortalId[] {
  const out: PortalId[] = ["member"];
  if (userType === "instructor" || userType === "admin") {
    out.push("instructor");
  }
  if (userType === "admin") {
    out.push("admin");
  }
  return out;
}

export const portalHomeHref: Record<PortalId, string> = {
  member: "/member/discover",
  instructor: "/instructor/today",
  admin: "/admin/overview",
};

export const portalLabel: Record<PortalId, string> = {
  member: "Member",
  instructor: "Instructor",
  admin: "Admin",
};
