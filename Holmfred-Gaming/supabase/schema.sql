-- Paste this whole file into Supabase: SQL Editor -> New query -> Run

create table if not exists public.user_libraries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  games jsonb not null default '[]'::jsonb,
  addon_matches jsonb not null default '{}'::jsonb,
  deleted_addons jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_libraries enable row level security;

grant select, insert, update, delete on table public.user_libraries to authenticated;

drop policy if exists "user_libraries_select" on public.user_libraries;
create policy "user_libraries_select"
on public.user_libraries
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "user_libraries_insert" on public.user_libraries;
create policy "user_libraries_insert"
on public.user_libraries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "user_libraries_update" on public.user_libraries;
create policy "user_libraries_update"
on public.user_libraries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "user_libraries_delete" on public.user_libraries;
create policy "user_libraries_delete"
on public.user_libraries
for delete
to authenticated
using ((select auth.uid()) = user_id);
