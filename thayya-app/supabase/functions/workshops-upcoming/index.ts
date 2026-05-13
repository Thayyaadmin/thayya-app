import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
          "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set the service role key as a function secret (never expose it in the browser).",
      },
      { status: 500, headers: corsHeaders },
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("workshops")
    .select(
      "id, title, date, price, instructor_id, instructor, instructor_profile:profiles!instructor_id(full_name)",
    )
    .or(`date.is.null,date.gte.${nowIso}`)
    .order("date", { ascending: true, nullsFirst: false })
    .limit(200);

  if (error) {
    console.error("[workshops-upcoming]", error.message);
    return Response.json(
      { error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }

  const workshops = (data ?? []).map((row) => {
    const profile = row.instructor_profile as { full_name?: string | null } | null;
    const instructorName =
      (profile?.full_name && String(profile.full_name)) ||
      (row.instructor != null && String(row.instructor)) ||
      null;
    return {
      id: row.id,
      title: row.title,
      date: row.date,
      price: row.price,
      instructor_id: row.instructor_id,
      instructor_name: instructorName,
    };
  });

  return Response.json({ workshops }, { headers: corsHeaders });
});
