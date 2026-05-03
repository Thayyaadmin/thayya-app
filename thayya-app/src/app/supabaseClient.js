import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from '@/lib/supabase-env';

const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

/** Browser Supabase client — session is stored in cookies (via @supabase/ssr) so middleware and server actions see auth. */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
