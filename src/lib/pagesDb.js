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

// ===== Temas de marca =====
// Cada marca define sus TOKENS de color; los componentes los consumen desde el
// contexto de la pagina (ver ComponentPreview). Tokens:
//   primary   = color principal/main de la marca (fondo de la pagina, textos base)
//   secondary = color de "relleno": gradiente del banner con tarjetas + cards
//               coloridas del mosaico
//   accent    = color de detalle: iconos y titulos de cards (banner con tarjetas,
//               carrusel de servicios, carrusel de cards). Puede coincidir con el
//               secundario (Pro Plan) o no (Fancy Feast, cuyo secundario es casi
//               blanco y no serviria para un icono).
//   dark      = la pagina se pinta en tema oscuro (texto claro sobre fondo oscuro)
const BRAND_THEMES = {
  'Pro Plan': { primary: '#111114', secondary: '#d7bb77', accent: '#d7bb77', dark: true },
  'Fancy Feast': { primary: '#ffffff', secondary: '#FFFCF1', accent: '#d7bb77', dark: false },
}

// Marca de la pagina (opcional). Las que tienen tema definido en BRAND_THEMES pintan
// el builder con sus colores; el resto usa el tema Purina por defecto.
export const PAGE_BRANDS = ['Pro Plan', 'Fancy Feast', 'Purina One', 'Dog Chow', 'Cat Chow', 'Felix', 'Excellent', 'Purina']

// ===== Categorias =====
// El tracker agrupa las paginas por categoria (Marca, Purina Adopta...). La lista es
// ABIERTA: estas son sugerencias, se puede escribir una nueva. Sin categoria = pagina
// suelta (ej. la Home), y va arriba de todo.
export const PAGE_CATEGORIES = ['Marca', 'Purina Adopta', 'Conoce Purina']

// La categoria "Marca" es la unica con SUBcategoria, y la subcategoria es la MARCA de
// la pagina: el campo `brand` que ya existe (el que define el tema visual). Asi no hay
// dos campos que decir lo mismo y desincronizarse: elegis la marca una sola vez y la
// pagina cae sola en el grupo de esa marca.
export const BRAND_CATEGORY = 'Marca'
export function pageSubcategory(p) {
  return p?.category === BRAND_CATEGORY ? (p.brand || null) : null
}

// Tema de una marca (o null si no tiene uno definido). Match tolerante al nombre
// (mayusculas/espacios), igual que antes.
export function brandTheme(brand) {
  const key = String(brand || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!key) return null
  for (const [name, theme] of Object.entries(BRAND_THEMES)) {
    if (name.toLowerCase() === key) return theme
  }
  return null
}

// ¿La marca usa tema oscuro (fondo negro)? Hoy solo Pro Plan.
export function pageIsDark(brand) {
  return !!brandTheme(brand)?.dark
}

// Color de fondo de la pagina segun la marca (el primario). null = fondo por defecto.
export function brandPageBg(brand) {
  return brandTheme(brand)?.primary || null
}

// Color secundario (gradiente del banner con tarjetas + cards del mosaico).
export function brandSecondaryColor(brand) {
  return brandTheme(brand)?.secondary || null
}

// Color principal/main de la marca.
export function brandPrimaryColor(brand) {
  return brandTheme(brand)?.primary || null
}

// Color de acento (iconos y titulos de cards).
export function brandAccentColor(brand) {
  return brandTheme(brand)?.accent || null
}

// Mercados con paginas en armado. El tracker de "Creacion de paginas" separa por
// mercado (una pestaña por cada uno). Los codigos son los de src/lib/countries.js.
export const PAGE_MARKETS = [
  { code: 'MX', label: 'México' },
  { code: 'BR', label: 'Brasil' },
]
export const PAGE_MARKET_LABEL = Object.fromEntries(PAGE_MARKETS.map((m) => [m.code, m.label]))

// Estados de una pagina (orden fijo, de menos a mas avanzado). Los valores guardados
// son los del CMS/proceso en ingles; la UI muestra la etiqueta en castellano.
export const PAGE_STATUSES = [
  'Not started', 'Filling Copydeck', 'Missing links', 'Scheduled', 'In progress', 'On hold', 'QA MRM', 'Done',
]
export const PAGE_STATUS_LABEL = {
  'Not started': 'No iniciada',
  'Filling Copydeck': 'Armando copydeck',
  'Missing links': 'Faltan links',
  Scheduled: 'Agendada',
  'In progress': 'En progreso',
  'On hold': 'En pausa',
  'QA MRM': 'QA MRM',
  Done: 'Lista',
}

// Nota: si la tabla `pages` ya existe sin las columnas `brand` / `market` / las urls,
// los ALTER de abajo las agregan. La app igual funciona sin ellas (guarda la pagina sin
// marca / sin mercado / sin links) hasta que se corran.
export const SETUP_SQL = `create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text,
  status text not null default 'Not started',
  brand text,
  market text,
  category text,
  notes text,
  url_old text,
  url_new text,
  url_copydeck text,
  url_figma text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.pages add column if not exists brand text;
alter table public.pages add column if not exists market text;
alter table public.pages add column if not exists category text;
alter table public.pages add column if not exists url_old text;
alter table public.pages add column if not exists url_new text;
alter table public.pages add column if not exists url_copydeck text;
alter table public.pages add column if not exists url_figma text;

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
    market: p.market?.trim() || null,
    category: p.category?.trim() || null,
    notes: p.notes?.trim() || null,
    url_old: p.url_old?.trim() || null,
    url_new: p.url_new?.trim() || null,
    url_copydeck: p.url_copydeck?.trim() || null,
    url_figma: p.url_figma?.trim() || null,
  }
}

// `brand`, `market`, `category` y las urls son columnas agregadas despues: si alguna
// todavia no existe en la tabla, el insert/update falla nombrandola. En ese caso se
// saca del payload y se reintenta (la pagina se guarda igual, sin ese dato).
const OPTIONAL_COLS = ['brand', 'market', 'category', 'url_old', 'url_new', 'url_copydeck', 'url_figma']
function missingOptionalCol(error) {
  if (!error) return null
  const msg = error.message || ''
  const looksMissing = error.code === 'PGRST204' || error.code === '42703' ||
    /column|schema cache|does not exist|find/i.test(msg)
  if (!looksMissing) return null
  return OPTIONAL_COLS.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(msg)) || null
}

// Corre `run(payload)` sacando las columnas opcionales que la tabla no tenga.
async function withOptionalCols(payload, run) {
  let res = await run(payload)
  for (let i = 0; i < OPTIONAL_COLS.length && res.error; i++) {
    const col = missingOptionalCol(res.error)
    if (!col || !(col in payload)) break
    delete payload[col]
    res = await run(payload)
  }
  return res
}

export async function createPage(p, sort_order) {
  const brand = p.brand?.trim() || null
  const payload = { ...pagePayload(p), sort_order: sort_order ?? 0 }
  const res = await withOptionalCols(payload, (pl) => supabase.from('pages').insert(pl).select().single())
  throwIf(res.error)
  setBrandLS(res.data?.id, brand) // espejo local (por si la columna no existe)
  return { ...res.data, brand }
}

export async function updatePage(id, p) {
  const brand = p.brand?.trim() || null
  const payload = pagePayload(p)
  if (p.sort_order != null) payload.sort_order = p.sort_order
  const res = await withOptionalCols(payload, (pl) => supabase.from('pages').update(pl).eq('id', id).select().single())
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

// Clona una pagina: crea una copia de su metadata (nombre + " (copia)") y duplica
// TODOS sus componentes (component_key + content + orden) en la pagina nueva.
export async function clonePage(page, sort_order) {
  const dupe = await createPage({
    name: `${page.name || 'Pagina'} (copia)`,
    path: page.path,
    status: page.status,
    brand: page.brand,
    market: page.market,
    category: page.category,
    notes: page.notes,
  }, sort_order)
  const { data: comps, error } = await fetchPageComponents(page.id)
  throwIf(error)
  if (comps && comps.length) {
    // Primero los sueltos, para conocer el id NUEVO de cada contenedor; despues los
    // hijos, reapuntando su parent_id al clon. Si se insertara todo junto, los hijos
    // quedarian colgando del bloque de pestañas de la pagina ORIGINAL.
    const roots = comps.filter((c) => !c.parent_id)
    const kids = comps.filter((c) => c.parent_id)
    const row = (c, parent_id) => ({
      page_id: dupe.id,
      component_key: c.component_key,
      content: c.content || {},
      sort_order: c.sort_order || 0,
      parent_id: parent_id ?? null,
      tab_index: parent_id ? (c.tab_index ?? 0) : null,
    })
    const { data: newRoots, error: rootErr } = await supabase
      .from('page_components').insert(roots.map((c) => row(c, null))).select()
    throwIf(rootErr)
    // Mapa id viejo -> id nuevo (el insert respeta el orden de las filas enviadas).
    const idMap = new Map(roots.map((c, i) => [c.id, newRoots[i]?.id]))
    if (kids.length) {
      const { error: kidErr } = await supabase
        .from('page_components').insert(kids.map((c) => row(c, idMap.get(c.parent_id) || null)))
      throwIf(kidErr)
    }
  }
  return dupe
}

// Seed inicial: hoy solo la Homepage (el resto de la lista llega mas tarde).
export async function seedPages(market) {
  return createPage({ name: 'Homepage', path: '/', status: 'Not started', market }, 0)
}

// ---- Componentes de una pagina (el "armado") ----
export async function fetchPageComponents(pageId) {
  const { data, error } = await supabase
    .from('page_components').select('*').eq('page_id', pageId).order('sort_order')
  if (error) return { data: [], error, tableMissing: isMissingTable(error) }
  return { data: data ?? [], error: null, tableMissing: false }
}

// `at` = donde cae: { parent_id, tab_index } para meterlo dentro de una pestaña,
// nada para dejarlo suelto en la pagina.
export async function addPageComponent(pageId, componentKey, sort_order, at = {}, content = {}) {
  const { data, error } = await supabase
    .from('page_components')
    .insert({
      page_id: pageId,
      component_key: componentKey,
      // Los atajos de la paleta traen contenido inicial (ej. el modo de vista del
      // Card Grid); los componentes a secas arrancan vacios.
      content: content || {},
      sort_order: sort_order ?? 0,
      parent_id: at.parent_id ?? null,
      tab_index: at.parent_id ? (at.tab_index ?? 0) : null,
    })
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
