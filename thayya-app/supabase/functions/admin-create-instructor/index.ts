import { corsHeaders } from "../_shared/require-authenticated-user.ts";
import { requireAdmin } from "../_shared/require-admin.ts";
import {
  instructorProfilePatch,
  isUuid,
  profileSelect,
  syncCategoryIds,
} from "../_shared/admin-instructor-profile.ts";

type Body = {
  /** `create` (default): new auth user + instructor profile. `promote`: member → instructor. */
  intent?: string;
  email?: string;
  /** Required for promote; ignored on create (new user id from Auth). */
  user_id?: string;
  full_name?: string;
  bio?: string | null;
  primary_location?: unknown;
  address_line?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  /** Replace instructor category assignments when provided (including []). */
  category_ids?: string[] | null;
  /** Create only: send invite email (default true when password omitted). */
  send_invite?: boolean;
  /** Create only: set password and skip invite (admin-provisioned login). */
  password?: string;
};

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function optionalTrimmedText(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

Deno.serve(async (req: Request) => {
  const logTag = "admin-create-instructor";

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  const auth = await requireAdmin(req, logTag);
  if (auth instanceof Response) return auth;
  const { admin } = auth;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers: corsHeaders });
  }

  const intent =
    typeof body.intent === "string" && body.intent.trim()
      ? body.intent.trim().toLowerCase()
      : "create";

  if (intent !== "create" && intent !== "promote") {
    return Response.json(
      { error: 'intent must be "create" or "promote"' },
      { status: 400, headers: corsHeaders },
    );
  }

  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  if (!fullName) {
    return Response.json({ error: "full_name is required" }, { status: 400, headers: corsHeaders });
  }

  const { patch, error: patchError } = instructorProfilePatch(body, fullName);
  if (patchError) {
    return Response.json({ error: patchError }, { status: 400, headers: corsHeaders });
  }

  let profileId: string;

  if (intent === "promote") {
    const userId =
      typeof body.user_id === "string" && body.user_id.trim()
        ? body.user_id.trim()
        : "";
    if (!userId || !isUuid(userId)) {
      return Response.json(
        { error: "Valid user_id is required for promote" },
        { status: 400, headers: corsHeaders },
      );
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
    if (!existing) {
      return Response.json({ error: "Profile not found" }, { status: 404, headers: corsHeaders });
    }
    if (existing.user_type === "admin") {
      return Response.json(
        { error: "Cannot change an admin profile to instructor" },
        { status: 400, headers: corsHeaders },
      );
    }

    profileId = userId;
  } else {
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !isEmail(email)) {
      return Response.json({ error: "Valid email is required" }, { status: 400, headers: corsHeaders });
    }

    const password =
      typeof body.password === "string" && body.password.length > 0
        ? body.password
        : null;
    const sendInvite = body.send_invite !== false && !password;

    const userMetadata: Record<string, string> = {
      full_name: fullName,
    };
    if (typeof body.bio === "string" && body.bio.trim()) {
      userMetadata.bio = body.bio.trim();
    }

    if (sendInvite) {
      const { data: inviteData, error: inviteErr } =
        await admin.auth.admin.inviteUserByEmail(email, {
          data: userMetadata,
        });

      if (inviteErr) {
        console.error(`[${logTag}] invite`, inviteErr.message);
        const status = inviteErr.message.toLowerCase().includes("already")
          ? 409
          : 400;
        return Response.json({ error: inviteErr.message }, { status, headers: corsHeaders });
      }

      if (!inviteData.user?.id) {
        return Response.json(
          { error: "Invite succeeded but no user id returned" },
          { status: 500, headers: corsHeaders },
        );
      }
      profileId = inviteData.user.id;
    } else {
      if (!password || password.length < 8) {
        return Response.json(
          { error: "password must be at least 8 characters when not sending an invite" },
          { status: 400, headers: corsHeaders },
        );
      }

      const { data: createData, error: createErr } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: userMetadata,
        });

      if (createErr) {
        console.error(`[${logTag}] createUser`, createErr.message);
        const status = createErr.message.toLowerCase().includes("already")
          ? 409
          : 400;
        return Response.json({ error: createErr.message }, { status, headers: corsHeaders });
      }

      if (!createData.user?.id) {
        return Response.json(
          { error: "User created but no user id returned" },
          { status: 500, headers: corsHeaders },
        );
      }
      profileId = createData.user.id;
    }

  }

  const writeQuery =
    intent === "promote"
      ? admin.from("profiles").update(patch).eq("id", profileId)
      : admin.from("profiles").upsert(
        { id: profileId, ...patch },
        { onConflict: "id" },
      );

  const { data: profile, error: writeErr } = await writeQuery
    .select(profileSelect)
    .single();

  if (writeErr) {
    console.error(`[${logTag}] write profile`, writeErr.message);
    return Response.json({ error: writeErr.message }, { status: 400, headers: corsHeaders });
  }

  if (body.category_ids !== undefined && body.category_ids !== null) {
    if (!Array.isArray(body.category_ids)) {
      return Response.json(
        { error: "category_ids must be an array of UUIDs" },
        { status: 400, headers: corsHeaders },
      );
    }
    const catResp = await syncCategoryIds(
      admin,
      profileId,
      body.category_ids,
      logTag,
    );
    if (catResp) return catResp;
  }

  return Response.json(
    {
      ...profile,
      invited: intent === "create" && body.send_invite !== false &&
        !(typeof body.password === "string" && body.password.length > 0),
    },
    { headers: corsHeaders },
  );
});
