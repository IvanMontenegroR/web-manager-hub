-- ============================================================================
-- Web Manager Hub — setup para el modulo "Creacion de paginas" (Ecosystem 2.0)
-- Correr UNA vez en el SQL Editor de Supabase (proyecto Purina-Hub). Idempotente.
--   - pages: lista de paginas a armar (estado + orden por prioridad)
--   - page_components: componentes colocados en cada pagina + su contenido
--     (para el builder visual y el export de matriz de contenido)
-- ============================================================================

create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text,
  status text not null default 'Not started',   -- Not started | In progress | On hold | Done
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.page_components (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  component_key text not null,                    -- clave del componente del catalogo
  content jsonb not null default '{}'::jsonb,     -- { campo_drupal: valor } para el export
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pages enable row level security;
alter table public.page_components enable row level security;

drop policy if exists "dummy_all_pages" on public.pages;
create policy "dummy_all_pages" on public.pages
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "dummy_all_page_components" on public.page_components;
create policy "dummy_all_page_components" on public.page_components
  for all to anon, authenticated using (true) with check (true);

-- Seed: hoy solo la Homepage (el resto de la lista se suma mas tarde).
insert into public.pages (name, path, status, sort_order)
select 'Homepage', '/', 'Not started', 0
where not exists (select 1 from public.pages);
