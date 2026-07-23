import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Created lazily so that importing modules never crash in local-first mode
// (no Supabase env vars). Accessing the client without configuration throws.
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable hosted mode.'
    );
  }
  if (!client) {
    client = createClient(url, key);
  }
  return client;
}

export const supabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const instance = getClient();
    const value = (instance as unknown as Record<PropertyKey, unknown>)[prop];
    return typeof value === 'function'
      ? (value as Function).bind(instance)
      : value;
  },
});
