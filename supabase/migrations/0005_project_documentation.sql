-- Run ONCE in Supabase Dashboard > SQL Editor (after 0004).
-- Optional link to the project documentation (http/https only).
alter table public.projects add column if not exists doc_url text
  check (doc_url is null or (doc_url ~* '^https?://' and length(doc_url) <= 500));
