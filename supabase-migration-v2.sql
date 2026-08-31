-- Run this once in Supabase SQL Editor if you already installed V1.
alter table public.documentary_requests
  add column if not exists media_type text not null default 'movie';

alter table public.documentary_requests
  drop constraint if exists documentary_requests_media_type_check;

alter table public.documentary_requests
  add constraint documentary_requests_media_type_check check (media_type in ('movie','tv'));

drop index if exists public.one_active_request_per_documentary;

create unique index if not exists one_active_request_per_documentary
on public.documentary_requests (tmdb_id, media_type)
where watched_at is null;
