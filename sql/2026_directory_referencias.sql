-- ============================================================================
-- Web Manager Hub — setup para el hub "Referencias": Marcas + Stakeholders
-- Correr UNA vez en el SQL Editor de Supabase (proyecto Purina-Hub).
-- Las tablas son idempotentes (create if not exists). El seed de datos al
-- final solo inserta si la tabla esta vacia, asi que se puede re-correr.
-- ============================================================================

-- 1) Ficha por marca: responsables, guidelines, links, notas.
create table if not exists public.directory_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owners jsonb not null default '[]'::jsonb,   -- nombres de responsables (texto)
  species text,                                 -- Gato / Perro / Ambos (opcional)
  color text,                                   -- acento opcional
  guidelines text,                              -- lineamientos / notas de brand
  links jsonb not null default '[]'::jsonb,     -- [{label, url}]
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 2) Directorio de personas: quien se encarga de que (marcas o temas libres).
--    El link marca<->persona es por NOMBRE (loose coupling), no por FK.
create table if not exists public.directory_stakeholders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  areas jsonb not null default '[]'::jsonb,     -- ["Friskies", "Fancy Feast", ...]
  email text,
  phone text,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 3) RLS abierta (fase dummy, igual que el resto de las tablas).
alter table public.directory_brands enable row level security;
alter table public.directory_stakeholders enable row level security;

drop policy if exists "dummy_all_dir_brands" on public.directory_brands;
create policy "dummy_all_dir_brands" on public.directory_brands
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "dummy_all_dir_stakeholders" on public.directory_stakeholders;
create policy "dummy_all_dir_stakeholders" on public.directory_stakeholders
  for all to anon, authenticated using (true) with check (true);

-- 4) Seed inicial (solo si estan vacias). Mismos datos que el boton "Cargar
--    iniciales" de la app. Marca -> responsable segun lo mapeado.
insert into public.directory_stakeholders (name, role, areas, sort_order)
select * from (values
  ('Marina',             'Brand owner', '["Friskies","Fancy Feast","Felix","Beneful"]'::jsonb, 0),
  ('Dani Camacho',       'Brand owner', '["Dog Chow","Cat Chow","Purina One"]'::jsonb,          1),
  ('Luciana Pellegrino', 'Brand owner', '["Pro Plan"]'::jsonb,                                  2)
) as v(name, role, areas, sort_order)
where not exists (select 1 from public.directory_stakeholders);

insert into public.directory_brands (name, owners, species, sort_order)
select * from (values
  ('Friskies',    '["Marina"]'::jsonb,             'Gato',  0),
  ('Fancy Feast', '["Marina"]'::jsonb,             'Gato',  1),
  ('Felix',       '["Marina"]'::jsonb,             'Gato',  2),
  ('Beneful',     '["Marina"]'::jsonb,             'Perro', 3),
  ('Dog Chow',    '["Dani Camacho"]'::jsonb,       'Perro', 4),
  ('Cat Chow',    '["Dani Camacho"]'::jsonb,       'Gato',  5),
  ('Purina One',  '["Dani Camacho"]'::jsonb,       'Ambos', 6),
  ('Pro Plan',    '["Luciana Pellegrino"]'::jsonb, 'Ambos', 7)
) as v(name, owners, species, sort_order)
where not exists (select 1 from public.directory_brands);
