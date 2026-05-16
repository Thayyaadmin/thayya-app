import { createClient } from "npm:@supabase/supabase-js@2";

import { fetchInstructorRatingSummaries } from "../_shared/instructor-ratings.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MAX = 128;

function normalizeSlug(raw: string | null): string | null {
  if (raw === null) return null;
  const s = raw.trim().toLowerCase();
  if (s.length === 0 || s.length > SLUG_MAX) return null;
  if (!SLUG_RE.test(s)) return null;
  return s;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    return Response.json(
      {
        error:
          "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set the service role key as a function secret.",
      },
      { status: 500, headers: corsHeaders },
    );
  }

  const slug = normalizeSlug(new URL(req.url).searchParams.get("slug"));
  if (!slug) {
    return Response.json({ error: "not_found" }, { status: 404, headers: corsHeaders });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, user_type, full_name, bio, slug, avatar_url")
    .eq("slug", slug)
    .maybeSingle();

  if (profileError) {
    console.error("[instructor-public] profile", profileError.message);
    return Response.json(
      { error: profileError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  if (!profile) {
    return Response.json({ error: "not_found" }, { status: 404, headers: corsHeaders });
  }

  if (profile.user_type !== "instructor" && profile.user_type !== "admin") {
    return Response.json({ error: "not_found" }, { status: 404, headers: corsHeaders });
  }

  const nowIso = new Date().toISOString();
  const { data: workshops, error: workshopsError } = await admin
    .from("workshops")
    .select("id, slug, title, date, price")
    .eq("instructor_id", profile.id)
    .or(`date.is.null,date.gte.${nowIso}`)
    .order("date", { ascending: true, nullsFirst: false });

  if (workshopsError) {
    console.error("[instructor-public] workshops", workshopsError.message);
    return Response.json(
      { error: workshopsError.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const ratingSummaries = await fetchInstructorRatingSummaries(admin, [profile.id]);
  const rating = ratingSummaries.get(profile.id) ?? {
    rating_avg: null,
    rating_count: 0,
  };

  return Response.json(
    {
      profile: { ...profile, ...rating },
      workshops: workshops ?? [],
    },
    { headers: corsHeaders },
  );
});
