import { getSupabaseEnv } from "@/lib/supabase-env";

export type UploadProfileAvatarSuccess = {
  avatar_url: string | null;
};

export type PostUploadProfileAvatarResult =
  | { ok: true; profile: UploadProfileAvatarSuccess }
  | { ok: false; status: number; message: string };

export type UploadAvatarProgressEvent = {
  loaded: number;
  total: number;
  lengthComputable: boolean;
};

function parseUploadAvatarResponse(
  status: number,
  text: string,
): PostUploadProfileAvatarResult {
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = {};
  }

  if (status >= 200 && status < 300) {
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
        : "Upload failed";

  return { ok: false, status, message };
}

export type PostUploadProfileAvatarOptions = {
  onProgress?: (e: UploadAvatarProgressEvent) => void;
  signal?: AbortSignal;
};

/**
 * POST multipart/form-data to `upload-profile-avatar` (field name `avatar`) with optional upload progress (bytes sent).
 */
export function postUploadProfileAvatarWithProgress(
  accessToken: string,
  file: File,
  options?: PostUploadProfileAvatarOptions,
): Promise<PostUploadProfileAvatarResult> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const url = `${supabaseUrl}/functions/v1/upload-profile-avatar`;
  const body = new FormData();
  body.append("avatar", file);
  const { onProgress, signal } = options ?? {};

  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({ ok: false, status: 0, message: "Cancelled" });
      return;
    }

    const xhr = new XMLHttpRequest();
    let settled = false;

    const finish = (result: PostUploadProfileAvatarResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const onAbort = () => {
      xhr.abort();
    };
    signal?.addEventListener("abort", onAbort);

    xhr.upload.addEventListener("progress", (ev) => {
      onProgress?.({
        loaded: ev.loaded,
        total: ev.total,
        lengthComputable: ev.lengthComputable,
      });
    });

    xhr.addEventListener("load", () => {
      signal?.removeEventListener("abort", onAbort);
      finish(parseUploadAvatarResponse(xhr.status, xhr.responseText));
    });

    xhr.addEventListener("error", () => {
      signal?.removeEventListener("abort", onAbort);
      finish({ ok: false, status: 0, message: "Network error" });
    });

    xhr.addEventListener("abort", () => {
      signal?.removeEventListener("abort", onAbort);
      finish({ ok: false, status: 0, message: "Cancelled" });
    });

    try {
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader("apikey", supabaseAnonKey);
      xhr.send(body);
    } catch (e) {
      signal?.removeEventListener("abort", onAbort);
      const message = e instanceof Error ? e.message : "Network error";
      finish({ ok: false, status: 0, message });
    }
  });
}

/**
 * POST multipart/form-data to `upload-profile-avatar` (field name `avatar`).
 */
export function postUploadProfileAvatar(
  accessToken: string,
  file: File,
): Promise<PostUploadProfileAvatarResult> {
  return postUploadProfileAvatarWithProgress(accessToken, file);
}
