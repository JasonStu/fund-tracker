import { createBrowserClient } from '@supabase/ssr';

// Client-side Supabase client (handles cookies automatically)
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
