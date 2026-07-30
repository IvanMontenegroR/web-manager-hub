-- Bucket publico para subir imagenes/videos de los componentes del builder
-- (Creacion de paginas). La app sube archivos aca y guarda la URL publica en el
-- content del componente. Fase dummy: politicas abiertas, igual que el resto.
-- Correr UNA vez en el SQL editor de Supabase (proyecto Purina-Hub).

insert into storage.buckets (id, name, public)
values ('page-media', 'page-media', true)
on conflict (id) do nothing;

-- Politicas abiertas sobre storage.objects para este bucket.
drop policy if exists "page-media read"   on storage.objects;
drop policy if exists "page-media insert" on storage.objects;
drop policy if exists "page-media update" on storage.objects;
drop policy if exists "page-media delete" on storage.objects;

create policy "page-media read"   on storage.objects for select using (bucket_id = 'page-media');
create policy "page-media insert" on storage.objects for insert with check (bucket_id = 'page-media');
create policy "page-media update" on storage.objects for update using (bucket_id = 'page-media') with check (bucket_id = 'page-media');
create policy "page-media delete" on storage.objects for delete using (bucket_id = 'page-media');
