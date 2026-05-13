import { MemberPortalShell } from "@/portals/member/MemberPortalShell";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <MemberPortalShell>{children}</MemberPortalShell>;
}
