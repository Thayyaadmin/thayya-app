import { InstructorPortalShell } from "@/portals/instructor/InstructorPortalShell";

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return <InstructorPortalShell>{children}</InstructorPortalShell>;
}
