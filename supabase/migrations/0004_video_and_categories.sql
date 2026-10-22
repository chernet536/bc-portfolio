-- Run ONCE in Supabase Dashboard > SQL Editor (after 0001 and 0003).
-- 1) Optional demo-video link for projects (http/https only).
alter table public.projects add column if not exists video_url text
  check (video_url is null or (video_url ~* '^https?://' and length(video_url) <= 500));

-- 2) Project categories. Safe to run again: existing ones are skipped.
insert into public.categories (kind, name, slug) values
  ('project', 'AL development',           'al-development'),
  ('project', 'Functional Configuration', 'functional-configuration'),
  ('project', 'ERP Implementation',       'erp-implementation')
on conflict (kind, slug) do nothing;

-- 3) The profile photo is stored in site_settings (key 'profile_photo'); the table and
--    its policies already exist from 0001, so nothing else is needed for it.
