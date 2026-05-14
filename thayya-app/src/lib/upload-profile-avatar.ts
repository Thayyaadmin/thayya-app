import { getSupabaseEnv } from "@/lib/supabase-env";

export type UploadProfileAvatarSuccess = {
  avatar_url: string | null;
};

export type PostUploadProfileAvatarResult =
  | { ok: true; profile: UploadProfileAvatarSuccess }
  | { ok: false; status: number; message: string };

/**
 * POST multipart/form-data to `upload-profile-avatar` (field name `avatar`).
 */
export async function postUploadProfileAvatar(
  accessToken: string,
  file: File,
): Promise<PostUploadProfileAvatarResult> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const url = `${supabaseUrl}/functions/v1/upload-profile-avatar`;
  const body = new FormData();
  body.append("avatar", file);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
      body,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, status: 0, message };
  }

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok) {
    const avatar_url =
      typeof json.avatar_url === "string" || json.avatar_url === null
        ? (json.avatar_url as string | null)
        : null;
    return { ok: true, profile: { avatar_url } };
  }

  const message =
    typeof json.error === "string"
      ? json.error
      : typeof json.message === "string"
        ? json.message
        : res.statusText || "Upload failed";

  return { ok: false, status: res.status, message };
}
