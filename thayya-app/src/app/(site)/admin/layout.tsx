import { redirect } from "next/navigation";
import { AdminPortalShell } from "@/portals/admin/AdminPortalShell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/profile";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const profile = await getProfileById(supabase, user.id);
  if (profile?.user_type !== "admin") {
    redirect("/member/discover");
  }
  return <AdminPortalShell>{children}</AdminPortalShell>;
}
