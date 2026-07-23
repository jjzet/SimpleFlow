import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// SimpleFlow is local-first: Supabase is optional. Without these env vars the
// app runs with no accounts and templates persist to browser storage.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const createClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable hosted mode.'
    );
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
