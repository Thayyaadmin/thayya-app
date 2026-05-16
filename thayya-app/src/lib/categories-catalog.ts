import { getSupabaseEnv } from "@/lib/supabase-env";

export type CategoryOption = {
  id: string;
  slug: string;
  label: string;
};

/** Active categories via `categories-active` Edge Function (no direct PostgREST / RLS). */
export async function fetchActiveCategories(): Promise<CategoryOption[]> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  const res = await fetch(`${supabaseUrl}/functions/v1/categories-active`, {
    headers: { apikey: supabaseAnonKey },
    next: { revalidate: 300 },
  });
  const json = (await res.json().catch(() => ({}))) as CategoryOption[] | { error?: string };
  if (!res.ok) {
    const msg = !Array.isArray(json) && typeof json.error === "string" ? json.error : res.statusText;
    throw new Error(msg || "Could not load categories");
  }
  return Array.isArray(json) ? json : [];
}
