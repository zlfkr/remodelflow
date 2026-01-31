-- Wall elevation layouts per project (1 row per project)
create table if not exists public.wall_elevation_layouts (
  project_id uuid primary key references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists wall_elevation_layouts_owner_id_idx
  on public.wall_elevation_layouts(owner_id);

alter table public.wall_elevation_layouts enable row level security;

-- Owners can read their own rows
create policy "owner can read wall elevation layouts"
on public.wall_elevation_layouts
for select
using (owner_id = auth.uid());

-- Owners can insert their own rows (app must send owner_id = auth.uid() on insert/upsert)
create policy "owner can insert wall elevation layouts"
on public.wall_elevation_layouts
for insert
with check (owner_id = auth.uid());

-- Owners can update their own rows
create policy "owner can update wall elevation layouts"
on public.wall_elevation_layouts
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Owners can delete their own rows
create policy "owner can delete wall elevation layouts"
on public.wall_elevation_layouts
for delete
using (owner_id = auth.uid());

-- Auto-update updated_at (table-specific function to avoid collisions with other tables)
create or replace function public.wall_elevation_layouts_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_wall_elevation_layouts_updated_at on public.wall_elevation_layouts;

create trigger trg_wall_elevation_layouts_updated_at
before update on public.wall_elevation_layouts
for each row execute function public.wall_elevation_layouts_set_updated_at();
