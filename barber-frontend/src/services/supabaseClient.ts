import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

// For development, provide sensible defaults if env vars are missing
const defaultUrl = 'http://127.0.0.1:54321';
const defaultAnonKey = 'REDACTED_JWT';

const finalUrl = supabaseUrl || defaultUrl;
const finalAnonKey = supabaseAnonKey || defaultAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.info('ℹ️ Using local Supabase defaults. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for production.');
}

export const supabase: SupabaseClient | null =
  finalUrl && finalAnonKey
    ? createClient(finalUrl, finalAnonKey, {
        auth: {
          // Keep sessions across refresh and refresh tokens automatically
          autoRefreshToken: true,
          persistSession: true,
        },
      })
    : null;

// Optional service role client (for server-side use only)
export const supabaseServiceRole: SupabaseClient | null =
  finalUrl && supabaseServiceRoleKey && typeof window === 'undefined'
    ? createClient(finalUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { 'x-client-info': 'staff-admin-service-role' },
        },
      })
    : null;

export const hasSupabaseClient = Boolean(supabase);
export const hasServiceRole = Boolean(supabaseServiceRole);
