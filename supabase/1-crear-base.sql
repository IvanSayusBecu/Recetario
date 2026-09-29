-- Recetario: tabla de recetas y carpeta de fotos.
-- Pegalo entero en Supabase > SQL Editor > New query y tocá "Run".

create table if not exists public.recetas (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.recetas enable row level security;

-- Cualquiera que tenga la app puede ver las recetas.
drop policy if exists "Ver recetas" on public.recetas;
create policy "Ver recetas" on public.recetas
  for select using (true);

-- Solo las cuentas que crees vos en Authentication pueden cargar, editar o borrar.
drop policy if exists "Cargar recetas" on public.recetas;
create policy "Cargar recetas" on public.recetas
  for insert to authenticated with check (true);
drop policy if exists "Editar recetas" on public.recetas;
create policy "Editar recetas" on public.recetas
  for update to authenticated using (true) with check (true);
drop policy if exists "Borrar recetas" on public.recetas;
create policy "Borrar recetas" on public.recetas
  for delete to authenticated using (true);

-- Carpeta pública para las fotos nuevas.
insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', true)
on conflict (id) do update set public = true;

drop policy if exists "Ver fotos" on storage.objects;
create policy "Ver fotos" on storage.objects
  for select using (bucket_id = 'fotos');
drop policy if exists "Subir fotos" on storage.objects;
create policy "Subir fotos" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');
drop policy if exists "Borrar fotos" on storage.objects;
create policy "Borrar fotos" on storage.objects
  for delete to authenticated using (bucket_id = 'fotos');
