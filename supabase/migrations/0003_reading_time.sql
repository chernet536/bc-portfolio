-- Reading time is calculated by the admin editor on save (Phase 5).
alter table public.posts add column reading_minutes integer not null default 1 check (reading_minutes > 0);
