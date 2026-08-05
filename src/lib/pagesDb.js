// Capa de datos del modulo "Creacion de paginas" (dentro de Ecosystem 2.0).
//   - pages: la lista de paginas a armar (estado + orden por prioridad)
//   - page_components: los componentes colocados en cada pagina, con su contenido
//     (para el builder + export de matriz de contenido; se usa mas adelante)
// Tablas propias con RLS abierta. Fetch tolerante: si faltan, la vista muestra el
// SETUP_SQL en pantalla, igual que ecosystem_tasks / directory.
import { supabase } from './supabase'

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

// Marca de la pagina (opcional). Define el tema visual del builder: Pro Plan usa
// fondo negro. La lista es curada; se puede ampliar sin tocar el resto.
export const PAGE_BRANDS = ['Pro Plan', 'Dog Chow', 'Cat Chow', 'Felix', 'Excellent', 'Purina']

// ¿La marca usa tema oscuro (fondo negro)? Hoy solo Pro Plan.
export function pageIsDark(brand) {
  return /pro\s*plan/i.test(brand || '')
}

// El color secundario de una marca (acento). Hoy solo Pro Plan (#d7bb77).
export function brandSecondaryColor(brand) {
  return /pro\s*plan/i.test(brand || '') ? '#d7bb77' : null
}

// Estados de una pagina (orden fijo, de menos a mas avanzado).
export const PAGE_STATUSES = ['Not started', 'In progress', 'On hold', 'Done']
export const PAGE_STATUS_LABEL = {
  'Not started': 'No iniciada',
  'In progress': 'En progreso',
  'On hold': 'En pausa',
  Done: 'Lista',
}

// Nota: si la tabla `pages` ya existe sin la columna `brand`, corré:
//   alter table public.pages add column if not exists brand text;
// La app igual funciona sin ella (guarda la pagina sin marca) hasta que la agregues.
export const SETUP_SQL = `create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text,
  status text not null default 'Not started',
  brand text,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pages add column if not exists brand text;

create table if not exists public.page_components (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  component_key text not null,
  content jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pages enable row level security;
alter table public.page_components enable row level security;

create policy "dummy_all_pages" on public.pages
  for all to anon, authenticated using (true) with check (true);
create policy "dummy_all_page_components" on public.page_components
  for all to anon, authenticated using (true) with check (true);`

// La columna `brand` puede no existir todavia en la DB. Para que la marca funcione
// igual (ej. el fondo negro de Pro Plan y el color del mosaico) se guarda tambien en
// localStorage, keyeado por page id. Cuando exista la columna, gana el valor de la DB.
const BRAND_LS_KEY = 'wmh_page_brands'
function readBrandLS() { try { return JSON.parse(localStorage.getItem(BRAND_LS_KEY) || '{}') } catch { return {} } }
function setBrandLS(id, brand) {
  if (!id) return
  const m = readBrandLS()
  if (brand) m[id] = brand; else delete m[id]
  try { localStorage.setItem(BRAND_LS_KEY, JSON.stringify(m)) } catch {}
}

export async function fetchPages() {
  const { data, error } = await supabase.from('pages').select('*').order('sort_order')
  if (error) return { data: [], error, tableMissing: isMissingTable(error) }
  const ls = readBrandLS()
  // Si la DB no trae brand (columna ausente o vacia), se usa el de localStorage.
  const rows = (data ?? []).map((p) => ({ ...p, brand: p.brand ?? ls[p.id] ?? null }))
  return { data: rows, error: null, tableMissing: false }
}

function pagePayload(p) {
  return {
    name: p.name?.trim() || '',
    path: p.path?.trim() || null,
    status: PAGE_STATUSES.includes(p.status) ? p.status : 'Not started',
    brand: p.brand?.trim() || null,
    notes: p.notes?.trim() || null,
  }
}

// La columna `brand` es nueva: si todavia no fue agregada a la tabla, el insert/update
// falla apuntando a esa columna. En ese caso se reintenta SIN brand (se guarda igual).
function isMissingBrand(error) {
  if (!error) return false
  return /brand/i.test(error.message || '') &&
    (error.code === 'PGRST204' || error.code === '42703' || /column|schema cache|does not exist|find/i.test(error.message || ''))
}

export async function createPage(p, sort_order) {
  const brand = p.brand?.trim() || null
  const payload = { ...pagePayload(p), sort_order: sort_order ?? 0 }
  let res = await supabase.from('pages').insert(payload).select().single()
  if (res.error && isMissingBrand(res.error)) { delete payload.brand; res = await supabase.from('pages').insert(payload).select().single() }
  throwIf(res.error)
  setBrandLS(res.data?.id, brand) // espejo local (por si la columna no existe)
  return { ...res.data, brand }
}

export async function updatePage(id, p) {
  const brand = p.brand?.trim() || null
  const payload = pagePayload(p)
  if (p.sort_order != null) payload.sort_order = p.sort_order
  let res = await supabase.from('pages').update(payload).eq('id', id).select().single()
  if (res.error && isMissingBrand(res.error)) { delete payload.brand; res = await supabase.from('pages').update(payload).eq('id', id).select().single() }
  throwIf(res.error)
  setBrandLS(id, brand) // espejo local (por si la columna no existe)
  return { ...res.data, brand }
}

// Cambio rapido de estado sin tocar el resto.
export async function setPageStatus(id, status) {
  const { error } = await supabase.from('pages').update({ status }).eq('id', id)
  throwIf(error)
}

// Persiste el orden nuevo (sort_order = indice) de las paginas dadas.
export async function persistPageOrder(pages) {
  await Promise.all(pages.map((p, i) => supabase.from('pages').update({ sort_order: i }).eq('id', p.id)))
}

export async function deletePage(id) {
  const { error } = await supabase.from('pages').delete().eq('id', id)
  throwIf(error)
}

// Seed inicial: hoy solo la Homepage (el resto de la lista llega mas tarde).
export async function seedPages() {
  const { data, error } = await supabase
    .from('pages').insert([{ name: 'Homepage', path: '/', status: 'Not started', sort_order: 0 }]).select()
  throwIf(error)
  return data
}

// ---- Componentes de una pagina (el "armado") ----
export async function fetchPageComponents(pageId) {
  const { data, error } = await supabase
    .from('page_components').select('*').eq('page_id', pageId).order('sort_order')
  if (error) return { data: [], error, tableMissing: isMissingTable(error) }
  return { data: data ?? [], error: null, tableMissing: false }
}

export async function addPageComponent(pageId, componentKey, sort_order) {
  const { data, error } = await supabase
    .from('page_components')
    .insert({ page_id: pageId, component_key: componentKey, content: {}, sort_order: sort_order ?? 0 })
    .select().single()
  throwIf(error)
  return data
}

export async function updatePageComponentContent(id, content) {
  const { data, error } = await supabase
    .from('page_components').update({ content: content || {} }).eq('id', id).select().single()
  throwIf(error)
  return data
}

export async function deletePageComponent(id) {
  const { error } = await supabase.from('page_components').delete().eq('id', id)
  throwIf(error)
}

export async function persistComponentOrder(components) {
  await Promise.all(components.map((c, i) => supabase.from('page_components').update({ sort_order: i }).eq('id', c.id)))
}
