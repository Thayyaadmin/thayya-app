import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/site-header";
import { MemberViewerLocationProvider } from "@/contexts/member-viewer-location-context";
import { allowedPortalsForUser } from "@/lib/site-portals";
import { getProfileById } from "@/lib/profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await getProfileById(supabase, user.id) : null;
  const allowedPortals = allowedPortalsForUser(profile?.user_type ?? null);

  return (
    <div className="min-h-screen">
      <MemberViewerLocationProvider>
        <SiteHeader
          allowedPortals={allowedPortals}
          userEmail={user?.email ?? null}
          isAuthenticated={!!user}
        />
        {children}
      </MemberViewerLocationProvider>
      <SiteFooter />
    </div>
  );
}
