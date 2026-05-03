export function normalizeSupabaseUrl(rawUrl) {
  const cleaned = String(rawUrl || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '');

  if (!cleaned) return '';

  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;

  try {
    const parsedUrl = new URL(withProtocol);
    return parsedUrl.origin;
  } catch {
    return withProtocol.replace(/\/+$/, '');
  }
}

export function getSupabaseEnv() {
  const supabaseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}
