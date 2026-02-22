import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Public client (subject to RLS) — use on the client side only
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (bypasses RLS) — use in server-side API routes only, never expose to the browser
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey, // falls back to anon if service key not set
  { auth: { autoRefreshToken: false, persistSession: false } }
);
