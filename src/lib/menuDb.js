// Capa de datos del MENU del sitio (header-main).
//
// Una fila por MERCADO: el menu de Mexico no es el de Brasil. Todo el arbol va en dos
// jsonb (`items` = los menus principales con sus submenus, `promos` = las tarjetas de
// la derecha) en vez de normalizarse en tablas: es un arbol chico que siempre se lee y
// se guarda entero, igual que `page_components.content`. Normalizarlo serian tres
// tablas y ninguna consulta que las aproveche.
//
// Fetch TOLERANTE como el resto de los modulos propios: si la tabla todavia no existe,
// se devuelve el default y la pantalla muestra el SETUP_SQL, sin romper nada.
import { supabase } from './supabase'
import { DEFAULT_MENU, DEFAULT_PROMOS } from '../data/siteMenu'

function throwIf(error) {
  if (error) throw new Error(error.message || 'Error de Supabase')
}

function isMissingTable(error) {
  if (!error) return false
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /does not exist|schema cache|find the table/i.test(error.message || '')
  )
}

export const SETUP_SQL = `create table if not exists public.site_menu (
  id uuid primary key default gen_random_uuid(),
  market text not null unique,
  items jsonb not null default '[]'::jsonb,
  promos jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.site_menu enable row level security;
-- Misma politica abierta que el resto de las tablas (fase dummy).
create policy dummy_all_site_menu on public.site_menu
  for all to anon, authenticated using (true) with check (true);`

// Menu de un mercado. Si la tabla no existe -> { missing: true } y el default, para
// que la pantalla pueda mostrar el SQL sin dejar al header sin menu.
export async function fetchSiteMenu(market) {
  const { data, error } = await supabase
    .from('site_menu').select('*').eq('market', market).maybeSingle()
  if (error) {
    if (isMissingTable(error)) return { missing: true, items: DEFAULT_MENU, promos: DEFAULT_PROMOS }
    throw new Error(error.message)
  }
  if (!data) return { empty: true, items: [], promos: [] }
  return {
    items: Array.isArray(data.items) ? data.items : [],
    promos: Array.isArray(data.promos) ? data.promos : [],
  }
}

// Upsert por mercado: la fila del mercado es unica, asi que guardar es reemplazarla.
export async function saveSiteMenu(market, { items, promos }) {
  const { error } = await supabase
    .from('site_menu')
    .upsert({ market, items: items || [], promos: promos || [], updated_at: new Date().toISOString() },
      { onConflict: 'market' })
  throwIf(error)
}

// Carga inicial de un mercado con el menu de referencia (el real de Mexico).
export async function seedSiteMenu(market) {
  await saveSiteMenu(market, { items: DEFAULT_MENU, promos: DEFAULT_PROMOS })
}
