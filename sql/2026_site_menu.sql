-- Menu del sitio (header-main), editable desde la app. Ya aplicado.
--
-- Una fila por MERCADO: el menu de Mexico no es el de Brasil. Todo el arbol va en dos
-- jsonb en vez de normalizarse en tres tablas: es un arbol chico que siempre se lee y
-- se escribe entero, igual que `page_components.content`, y no hay ninguna consulta
-- que aprovecharia tenerlo normalizado.
--   items  = los menus principales, cada uno con su layout y sus submenus
--   promos = las tarjetas de la derecha (las mismas en todos los menus del mercado;
--            pueden ser 0, 1 o 2)
--
-- La politica es la misma `dummy_all` que el resto de las tablas. Es la deuda asumida
-- de la fase dummy, no un descuido: ver "Seguridad / RLS" en CLAUDE.md.
create table if not exists public.site_menu (
  id uuid primary key default gen_random_uuid(),
  market text not null unique,
  items jsonb not null default '[]'::jsonb,
  promos jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.site_menu enable row level security;
drop policy if exists dummy_all_site_menu on public.site_menu;
create policy dummy_all_site_menu on public.site_menu
  for all to anon, authenticated using (true) with check (true);

-- El menu real de Mexico se sembro desde la app con "Cargar menu de referencia"
-- (el contenido esta en src/data/siteMenu.js -> DEFAULT_MENU / DEFAULT_PROMOS).
