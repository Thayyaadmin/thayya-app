import { InstructorSubNav } from "./InstructorSubNav";

export function InstructorPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="portal">
      <InstructorSubNav />
      {children}
    </section>
  );
}
