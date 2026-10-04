-- Run this in the Supabase SQL Editor (Project → SQL → New query).

create table if not exists public.user_libraries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  games jsonb not null default '[]'::jsonb,
  addon_matches jsonb not null default '{}'::jsonb,
  deleted_addons jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_libraries enable row level security;

drop policy if exists "Users can read own library" on public.user_libraries;
create policy "Users can read own library"
  on public.user_libraries
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own library" on public.user_libraries;
create policy "Users can insert own library"
  on public.user_libraries
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own library" on public.user_libraries;
create policy "Users can update own library"
  on public.user_libraries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own library" on public.user_libraries;
create policy "Users can delete own library"
  on public.user_libraries
  for delete
  using (auth.uid() = user_id);
