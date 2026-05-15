import { createClient } from "npm:@supabase/supabase-js@2";
import { AwsClient } from "npm:aws4fetch@1.0.20";

/**
 * Authenticated users upload a profile image; file is stored in Cloudflare R2
 * and `profiles.avatar_url` is updated.
 *
 * Secrets / env (set in Supabase Dashboard → Edge Functions → Secrets):
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET_NAME
 *   R2_PUBLIC_URL        — public origin for objects, no trailing slash (e.g. https://cdn.example.com)
 *
 * Optional:
 *   R2_AVATAR_PREFIX      — defaults to "profile-avatars"
 *
 * Request: POST multipart/form-data with a single file field named `avatar` or `file`.
 * Allowed types: image/jpeg, image/png, image/webp. Max size 5 MiB.
 */
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function normalizePublicBase(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function objectKeyFromPublicUrl(publicBase: string, url: string): string | null {
  const base = normalizePublicBase(publicBase);
  if (!url.startsWith(base + "/") && !url.startsWith(base + "%2F")) return null;
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, "");
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

/** Per-key path-segment encoding that preserves "/" separators. */
function encodeObjectKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function r2ObjectUrl(accountId: string, bucket: string, key: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodeObjectKey(key)}`;
}

function r2SignedClient(accessKeyId: string, secretAccessKey: string): AwsClient {
  return new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const accountId = Deno.env.get("R2_ACCOUNT_ID");
  const r2Key = Deno.env.get("R2_ACCESS_KEY_ID");
  const r2Secret = Deno.env.get("R2_SECRET_ACCESS_KEY");
  const bucket = Deno.env.get("R2_BUCKET_NAME");
  const publicBase = Deno.env.get("R2_PUBLIC_URL");

  if (!supabaseUrl || !anonKey) {
    return Response.json(
      { error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" },
      { status: 500, headers: corsHeaders },
    );
  }
  if (!accountId || !r2Key || !r2Secret || !bucket || !publicBase) {
    return Response.json(
      {
        error:
          "Server misconfigured: set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL",
      },
      { status: 500, headers: corsHeaders },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401, headers: corsHeaders },
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return Response.json({ error: "Invalid or expired session" }, { status: 401, headers: corsHeaders });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart/form-data body" }, { status: 400, headers: corsHeaders });
  }

  const entry = form.get("avatar") ?? form.get("file");
  if (!entry || typeof entry === "string") {
    return Response.json(
      { error: "Missing file field: use form field name \"avatar\" or \"file\"" },
      { status: 400, headers: corsHeaders },
    );
  }

  const file = entry as File;
  const contentType = (file.type || "").toLowerCase().split(";")[0]?.trim() ?? "";
  const ext = ALLOWED[contentType];
  if (!ext) {
    return Response.json(
      { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `Image too large (max ${MAX_BYTES / (1024 * 1024)} MiB)` },
      { status: 400, headers: corsHeaders },
    );
  }

  const prefix = (Deno.env.get("R2_AVATAR_PREFIX") ?? "profile-avatars").replace(/^\/+|\/+$/g, "");
  const objectKey = `${prefix}/${user.id}/${crypto.randomUUID()}.${ext}`;
  const body = new Uint8Array(await file.arrayBuffer());

  const r2 = r2SignedClient(r2Key, r2Secret);
  const publicBaseNorm = normalizePublicBase(publicBase);
  const avatarUrl = `${publicBaseNorm}/${objectKey}`;

  // === DEBUG: remove once the 403 from R2 is resolved. ============================
  // Logs only the non-secret parts of the R2 config and the URL being signed, so we
  // can confirm in the dashboard logs that the right credentials and bucket name are
  // bound at request time. Never log the full access key id or the secret.
  console.log(
    "[upload-profile-avatar][diag]",
    JSON.stringify({
      account_id: accountId,
      account_id_len: accountId.length,
      bucket,
      access_key_id_prefix: r2Key.slice(0, 4),
      access_key_id_suffix: r2Key.slice(-2),
      access_key_id_len: r2Key.length,
      secret_len: r2Secret.length,
      object_url: r2ObjectUrl(accountId, bucket, objectKey),
      content_type: contentType,
      body_bytes: body.byteLength,
    }),
  );
  // ===============================================================================

  const { data: prior, error: priorErr } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (priorErr) {
    console.error("[upload-profile-avatar] prior select", priorErr.message);
    return Response.json({ error: priorErr.message }, { status: 400, headers: corsHeaders });
  }

  const previousUrl =
    prior && typeof prior.avatar_url === "string" && prior.avatar_url.startsWith("http")
      ? prior.avatar_url
      : null;

  try {
    const putRes = await r2.fetch(r2ObjectUrl(accountId, bucket, objectKey), {
      method: "PUT",
      body,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
    if (!putRes.ok) {
      const detail = await putRes.text().catch(() => "");
      throw new Error(`R2 PUT ${putRes.status}: ${detail.slice(0, 200)}`);
    }
  } catch (e) {
    console.error("[upload-profile-avatar] R2 PUT", e);
    return Response.json({ error: "Failed to store image" }, { status: 502, headers: corsHeaders });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)
    .select(
      "id, user_type, full_name, bio, slug, avatar_url, primary_location, address_line, city, state, country, created_at, updated_at",
    )
    .maybeSingle();

  if (updateErr) {
    console.error("[upload-profile-avatar] profile update", updateErr.message);
    try {
      await r2.fetch(r2ObjectUrl(accountId, bucket, objectKey), { method: "DELETE" });
    } catch (delErr) {
      console.error("[upload-profile-avatar] rollback delete failed", delErr);
    }
    return Response.json({ error: updateErr.message }, { status: 400, headers: corsHeaders });
  }

  if (!updated) {
    console.error(
      "[upload-profile-avatar] profile update",
      "no row returned (missing profiles row, RLS blocked update, or duplicate ids)",
    );
    try {
      await r2.fetch(r2ObjectUrl(accountId, bucket, objectKey), { method: "DELETE" });
    } catch (delErr) {
      console.error("[upload-profile-avatar] rollback delete failed", delErr);
    }
    return Response.json(
      {
        error:
          "Profile was not updated (no matching row returned). Check that a profiles row exists for your user and that RLS allows your role to update it.",
      },
      { status: 400, headers: corsHeaders },
    );
  }

  if (previousUrl) {
    const oldKey = objectKeyFromPublicUrl(publicBaseNorm, previousUrl);
    if (oldKey && oldKey !== objectKey && oldKey.startsWith(`${prefix}/${user.id}/`)) {
      try {
        await r2.fetch(r2ObjectUrl(accountId, bucket, oldKey), { method: "DELETE" });
      } catch (delErr) {
        console.error("[upload-profile-avatar] old object delete", delErr);
      }
    }
  }

  return Response.json(updated, { headers: corsHeaders });
});
