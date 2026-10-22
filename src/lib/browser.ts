import { createClient } from "@supabase/supabase-js";
// Browser client: anon key only. Every write is enforced by Row Level Security.
export const sb = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
