import { corsHeaders } from "../_shared/require-authenticated-user.ts";
import { requireAdmin } from "../_shared/require-admin.ts";
import {
  instructorProfilePatch,
  isUuid,
  loadCategoryIdsForProfile,
  loadCategoryLabelsForProfiles,
  pointToGeoJson,
  profileSelect,
  syncCategoryIds,
  type InstructorProfileBody,
} from "../_shared/admin-instructor-profile.ts";

type UpdateBody = InstructorProfileBody & {
  intent?: string;
  user_id?: string;
};

async function enrichWithEmail(
  admin: import("npm:@supabase/supabase-js@2").SupabaseClient,
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (const row of rows) {
    const id = row.id as string;
    let email: string | null = null;
    try {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (!error && data?.user?.email) email = data.user.email;
    } catch {
      /* ignore */
    }
    out.push({ ...row, email });
  }
  return out;
}

Deno.serve(async (req: Request) => {
  const logTag = "admin-instructors";

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await requireAdmin(req, logTag);
  if (auth instanceof Response) return auth;
  const { admin } = auth;

  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";

    if (id) {
      if (!isUuid(id)) {
        return Response.json({ error: "Invalid id" }, { status: 400, headers: corsHeaders });
      }

      const { data: profile, error } = await admin
        .from("profiles")
        .select(profileSelect)
        .eq("id", id)
        .eq("user_type", "instructor")
        .maybeSingle();

      if (error) {
        console.error(`[${logTag}] get profile`, error.message);
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
      }
      if (!profile) {
        return Response.json({ error: "Instructor not found" }, { status: 404, headers: corsHeaders });
      }

      let category_ids: string[] = [];
      try {
        category_ids = await loadCategoryIdsForProfile(admin, id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load categories";
        return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
      }

      const [enriched] = await enrichWithEmail(admin, [profile as Record<string, unknown>]);
      const geo = pointToGeoJson(profile.primary_location);

      return Response.json(
        {
          ...enriched,
          primary_location: geo,
          category_ids,
        },
        { headers: corsHeaders },
      );
    }

    const params = new URL(req.url).searchParams;
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, Number.parseInt(params.get("page_size") ?? "10", 10) || 10),
    );
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: profiles, error, count } = await admin
      .from("profiles")
      .select(
        "id, full_name, bio, slug, avatar_url, city, country, created_at, updated_at",
        { count: "exact" },
      )
      .eq("user_type", "instructor")
      .order("full_name", { ascending: true })
      .range(from, to);

    if (error) {
      console.error(`[${logTag}] list`, error.message);
      return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    const total = count ?? 0;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    const rows = (profiles ?? []) as Record<string, unknown>[];
    const ids = rows.map((r) => r.id as string);

    let categoryMap: Map<string, { id: string; slug: string; label: string }[]>;
    try {
      categoryMap = await loadCategoryLabelsForProfiles(admin, ids);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load categories";
      return Response.json({ error: msg }, { status: 500, headers: corsHeaders });
    }

    const withCategories = rows.map((r) => ({
      ...r,
      categories: categoryMap.get(r.id as string) ?? [],
    }));

    const enriched = await enrichWithEmail(admin, withCategories);
    return Response.json(
      {
        data: enriched,
        total,
        page,
        page_size: pageSize,
        total_pages: totalPages,
      },
      { headers: corsHeaders },
    );
  }

  if (req.method === "POST") {
    let body: UpdateBody;
    try {
      body = (await req.json()) as UpdateBody;
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
    }

    const intent =
      typeof body.intent === "string" && body.intent.trim()
        ? body.intent.trim().toLowerCase()
        : "update";

    if (intent !== "update") {
      return Response.json(
        { error: 'Only intent "update" is supported on this endpoint' },
        { status: 400, headers: corsHeaders },
      );
    }

    const userId =
      typeof body.user_id === "string" && body.user_id.trim()
        ? body.user_id.trim()
        : "";
    if (!userId || !isUuid(userId)) {
      return Response.json(
        { error: "Valid user_id is required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    if (!fullName) {
      return Response.json({ error: "full_name is required" }, { status: 400, headers: corsHeaders });
    }

    const { data: existing, error: loadErr } = await admin
      .from("profiles")
      .select("id, user_type")
      .eq("id", userId)
      .maybeSingle();

    if (loadErr) {
      console.error(`[${logTag}] load profile`, loadErr.message);
      return Response.json({ error: loadErr.message }, { status: 500, headers: corsHeaders });
    }
    if (!existing || existing.user_type !== "instructor") {
      return Response.json({ error: "Instructor not found" }, { status: 404, headers: corsHeaders });
    }

    const { patch, error: patchError } = instructorProfilePatch(body, fullName);
    if (patchError) {
      return Response.json({ error: patchError }, { status: 400, headers: corsHeaders });
    }

    const { data: profile, error: writeErr } = await admin
      .from("profiles")
      .update(patch)
      .eq("id", userId)
      .select(profileSelect)
      .single();

    if (writeErr) {
      console.error(`[${logTag}] update profile`, writeErr.message);
      return Response.json({ error: writeErr.message }, { status: 400, headers: corsHeaders });
    }

    if (body.category_ids !== undefined && body.category_ids !== null) {
      if (!Array.isArray(body.category_ids)) {
        return Response.json(
          { error: "category_ids must be an array of UUIDs" },
          { status: 400, headers: corsHeaders },
        );
      }
      const catResp = await syncCategoryIds(admin, userId, body.category_ids, logTag);
      if (catResp) return catResp;
    }

    let category_ids: string[] = [];
    try {
      category_ids = await loadCategoryIdsForProfile(admin, userId);
    } catch {
      /* non-fatal */
    }

    const geo = pointToGeoJson(profile.primary_location);
    return Response.json(
      { ...profile, primary_location: geo, category_ids },
      { headers: corsHeaders },
    );
  }

  return Response.json(
    { error: "Method not allowed" },
    { status: 405, headers: corsHeaders },
  );
});
