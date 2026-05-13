import { AdminSubNav } from "./AdminSubNav";

export function AdminPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="portal">
      <AdminSubNav />
      {children}
    </section>
  );
}
