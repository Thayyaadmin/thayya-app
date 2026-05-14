import { MemberSubNav } from "./MemberSubNav";

export function MemberPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="portal">
      <MemberSubNav />
      {children}
    </section>
  );
}
