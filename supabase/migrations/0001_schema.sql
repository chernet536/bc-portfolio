-- Run in Supabase Dashboard > SQL Editor, once, on a new project.
create extension if not exists pgcrypto;

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('post','project')),
  name text not null check (length(name) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  unique (kind, slug)
);
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  title text not null check (length(title) between 1 and 200),
  excerpt text not null default '' check (length(excerpt) <= 500),
  content_html text not null default '',
  cover_url text,
  category_id uuid references public.categories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published')),
  featured boolean not null default false,
  published_at timestamptz,
  seo_title text check (length(seo_title) <= 70),
  seo_description text check (length(seo_description) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or published_at is not null)
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 120),
  title text not null check (length(title) between 1 and 200),
  summary text not null default '' check (length(summary) <= 500),
  description_html text not null default '',
  business_problem_html text not null default '',
  solution_html text not null default '',
  implementation_html text not null default '',
  technologies text[] not null default '{}',
  cover_url text,
  screenshots text[] not null default '{}',
  category_id uuid references public.categories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published')),
  featured boolean not null default false,
  published_at timestamptz,
  seo_title text check (length(seo_title) <= 70),
  seo_description text check (length(seo_description) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'draft' or published_at is not null)
);
create table public.post_tags (
  post_id uuid references public.posts(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (post_id, tag_id)
);
create table public.project_tags (
  project_id uuid references public.projects(id) on delete cascade,
  tag_id uuid references public.tags(id) on delete cascade,
  primary key (project_id, tag_id)
);
create table public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  alt_text text not null default '',
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 100),
  email text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 200),
  body text not null check (length(body) between 5 and 5000),
  created_at timestamptz not null default now()
);

create index posts_published_idx on public.posts (published_at desc) where status = 'published';
create index projects_published_idx on public.projects (published_at desc) where status = 'published';
create index post_tags_tag_idx on public.post_tags (tag_id);
create index project_tags_tag_idx on public.project_tags (tag_id);
create index posts_category_idx on public.posts (category_id);
create index projects_category_idx on public.projects (category_id);

create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();

alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.posts enable row level security;
alter table public.projects enable row level security;
alter table public.post_tags enable row level security;
alter table public.project_tags enable row level security;
alter table public.media enable row level security;
alter table public.site_settings enable row level security;
alter table public.messages enable row level security;

create policy "admins read own row" on public.admins for select to authenticated using (user_id = auth.uid());
create policy "public read categories" on public.categories for select to anon, authenticated using (true);
create policy "admin write categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public read tags" on public.tags for select to anon, authenticated using (true);
create policy "admin write tags" on public.tags for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read published posts" on public.posts for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy "admin all posts" on public.posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public read published projects" on public.projects for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy "admin all projects" on public.projects for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "read post_tags" on public.post_tags for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.status = 'published' and p.published_at <= now()) or public.is_admin());
create policy "admin write post_tags" on public.post_tags for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "read project_tags" on public.project_tags for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.status = 'published' and p.published_at <= now()) or public.is_admin());
create policy "admin write project_tags" on public.project_tags for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read media" on public.media for select to anon, authenticated using (true);
create policy "admin write media" on public.media for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admin write settings" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "anyone can send a message" on public.messages for insert to anon, authenticated with check (true);
create policy "admin read messages" on public.messages for select to authenticated using (public.is_admin());
create policy "admin delete messages" on public.messages for delete to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "admin upload media" on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_admin());
create policy "admin update media" on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_admin());
create policy "admin delete media" on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());
