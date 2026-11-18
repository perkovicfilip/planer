-- Planer: jedna tabela za sve podatke. Pokreni jednom u Supabase → SQL Editor.

create table if not exists public.items (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  kind       text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  deleted    boolean     not null default false,
  primary key (user_id, id)
);

create index if not exists items_user_kind on public.items (user_id, kind);

alter table public.items enable row level security;

drop policy if exists "items_select_own" on public.items;
drop policy if exists "items_insert_own" on public.items;
drop policy if exists "items_update_own" on public.items;
drop policy if exists "items_delete_own" on public.items;

create policy "items_select_own" on public.items for select using (auth.uid() = user_id);
create policy "items_insert_own" on public.items for insert with check (auth.uid() = user_id);
create policy "items_update_own" on public.items for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "items_delete_own" on public.items for delete using (auth.uid() = user_id);

-- Promene se odmah vide i na drugom uređaju
do $$
begin
  alter publication supabase_realtime add table public.items;
exception when duplicate_object then null;
end $$;
