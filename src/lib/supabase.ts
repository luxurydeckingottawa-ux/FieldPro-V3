import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase credentials not configured. Running in offline/localStorage mode. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

/**
 * The Supabase client instance.
 * Returns null if credentials are not configured, allowing
 * the app to fall back to localStorage gracefully during development.
 */
export const supabase: SupabaseClient | null = 
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

/**
 * Check if we have a live Supabase connection.
 * Used throughout the app to decide between DB and localStorage.
 */
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};

/**
 * The fixed org_id for Luxury Decking.
 * When we go multi-tenant, this will come from the authenticated user's profile.
 */
export const LUXURY_DECKING_ORG_ID = '00000000-0000-0000-0000-000000000001';
