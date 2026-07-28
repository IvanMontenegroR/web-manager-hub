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

// Estados de una pagina (orden fijo, de menos a mas avanzado).
export const PAGE_STATUSES = ['Not started', 'In progress', 'On hold', 'Done']
export const PAGE_STATUS_LABEL = {
  'Not started': 'No iniciada',
  'In progress': 'En progreso',
  'On hold': 'En pausa',
  Done: 'Lista',
}

export const SETUP_SQL = `create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text,
  status text not null default 'Not started',
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

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

export async function fetchPages() {
  const { data, error } = await supabase.from('pages').select('*').order('sort_order')
  if (error) return { data: [], error, tableMissing: isMissingTable(error) }
  return { data: data ?? [], error: null, tableMissing: false }
}

function pagePayload(p) {
  return {
    name: p.name?.trim() || '',
    path: p.path?.trim() || null,
    status: PAGE_STATUSES.includes(p.status) ? p.status : 'Not started',
    notes: p.notes?.trim() || null,
  }
}

export async function createPage(p, sort_order) {
  const { data, error } = await supabase
    .from('pages').insert({ ...pagePayload(p), sort_order: sort_order ?? 0 }).select().single()
  throwIf(error)
  return data
}

export async function updatePage(id, p) {
  const payload = pagePayload(p)
  if (p.sort_order != null) payload.sort_order = p.sort_order
  const { data, error } = await supabase.from('pages').update(payload).eq('id', id).select().single()
  throwIf(error)
  return data
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
