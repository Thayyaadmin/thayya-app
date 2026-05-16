import { getSupabaseEnv } from "@/lib/supabase-env";
import type { PrimaryLocationPayload } from "@/lib/primary-location";

export type AdminInstructorCategory = {
  id: string;
  slug: string;
  label: string;
};

export type AdminInstructorListRow = {
  id: string;
  full_name: string;
  bio: string | null;
  slug: string | null;
  avatar_url: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  categories: AdminInstructorCategory[];
};

export type AdminInstructorDetail = AdminInstructorListRow & {
  user_type: string;
  address_line: string | null;
  state: string | null;
  primary_location: PrimaryLocationPayload["primary_location"] | null;
  category_ids: string[];
};

export type AdminUpdateInstructorBody = {
  intent: "update";
  user_id: string;
  full_name: string;
  bio?: string | null;
  category_ids?: string[];
} & Partial<
  Pick<
    PrimaryLocationPayload,
    "primary_location" | "address_line" | "city" | "state" | "country"
  >
>;

export type AdminInstructorsPageResult = {
  data: AdminInstructorListRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

export const ADMIN_INSTRUCTORS_PAGE_SIZE = 10;

export async function fetchAdminInstructors(
  accessToken: string,
  options?: { page?: number; pageSize?: number },
): Promise<AdminInstructorsPageResult> {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = options?.pageSize ?? ADMIN_INSTRUCTORS_PAGE_SIZE;
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const qs = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const res = await fetch(`${supabaseUrl}/functions/v1/admin-instructors?${qs}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
    },
  });
  const json = (await res.json().catch(() => ({}))) as AdminInstructorsPageResult & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      typeof json.error === "string" ? json.error : res.statusText || "Could not load instructors",
    );
  }
  return {
    data: Array.isArray(json.data) ? json.data : [],
    total: typeof json.total === "number" ? json.total : 0,
    page: typeof json.page === "number" ? json.page : page,
    page_size: typeof json.page_size === "number" ? json.page_size : pageSize,
    total_pages: typeof json.total_pages === "number" ? json.total_pages : 0,
  };
}

export async function fetchAdminInstructor(
  accessToken: string,
  id: string,
): Promise<AdminInstructorDetail> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const res = await fetch(
    `${supabaseUrl}/functions/v1/admin-instructors?id=${encodeURIComponent(id)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
    },
  );
  const json = (await res.json().catch(() => ({}))) as AdminInstructorDetail & { error?: string };
  if (!res.ok) {
    throw new Error(typeof json.error === "string" ? json.error : res.statusText || "Not found");
  }
  return json;
}

export async function adminUpdateInstructor(
  accessToken: string,
  body: AdminUpdateInstructorBody,
): Promise<AdminInstructorDetail> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const res = await fetch(`${supabaseUrl}/functions/v1/admin-instructors`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as AdminInstructorDetail & { error?: string };
  if (!res.ok) {
    throw new Error(typeof json.error === "string" ? json.error : res.statusText || "Update failed");
  }
  return json;
}
