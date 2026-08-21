-- Componentes CONTENEDOR (bloque de "Pestañas"): la pagina pasa a ser un arbol de un
-- nivel. Un componente puede colgar de otro (parent_id) y caer en una pestaña puntual
-- (tab_index). Los bloques sueltos de la pagina siguen con parent_id NULL.
-- Ya aplicado en Supabase (migracion `page_components_tabs_nesting`).

alter table public.page_components
  add column if not exists parent_id uuid references public.page_components(id) on delete cascade,
  add column if not exists tab_index int;

-- Orden dentro de una pestaña (los hijos se ordenan entre ellos, aparte de los sueltos).
create index if not exists page_components_parent_idx
  on public.page_components (parent_id, tab_index, sort_order);
